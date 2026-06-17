// Pure scheduling helpers — no Firebase, no React. Used by the schedules page,
// teachers filters, and the dashboard late-alert carousel.

import type { ClassSession, Teacher, SessionDay } from "@/lib/types";

/** "HH:MM" → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Do two [start,end) time ranges (same day) overlap? */
export function timeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

export interface SessionConflict {
  a: ClassSession;
  b: ClassSession;
  reason: "teacher" | "room";
}

/**
 * Real double-bookings: two sessions on the same day whose times overlap and
 * that share a teacher (same teacherId) or a room (same classGroup).
 */
export function findConflicts(sessions: ClassSession[]): SessionConflict[] {
  const conflicts: SessionConflict[] = [];
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (a.day !== b.day) continue;
      if (!timeOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
      if (a.teacherId && a.teacherId === b.teacherId) {
        conflicts.push({ a, b, reason: "teacher" });
      } else if (a.classGroup === b.classGroup) {
        conflicts.push({ a, b, reason: "room" });
      }
    }
  }
  return conflicts;
}

/** Teachers with no session overlapping the given day/time window. */
export function freeTeachers(
  teachers: Teacher[],
  sessions: ClassSession[],
  day: SessionDay,
  start: string,
  end: string,
  excludeSessionId?: string
): Teacher[] {
  const busyIds = new Set(
    sessions
      .filter(
        (s) =>
          s.id !== excludeSessionId &&
          s.day === day &&
          timeOverlap(s.startTime, s.endTime, start, end)
      )
      .map((s) => s.teacherId)
  );
  return teachers.filter((t) => !busyIds.has(t.id) && !busyIds.has(t.employeeId));
}

/** A teacher's sessions on a given day, sorted by start time. */
export function sessionsForTeacherToday(
  sessions: ClassSession[],
  teacherId: string,
  day: SessionDay
): ClassSession[] {
  return sessions
    .filter((s) => s.teacherId === teacherId && s.day === day)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

/** Distinct subjects a teacher teaches (derived from the schedule). */
export function subjectsForTeacher(sessions: ClassSession[], teacherId: string): string[] {
  return [...new Set(sessions.filter((s) => s.teacherId === teacherId).map((s) => s.subject))];
}

const DAY_INDEX: SessionDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

/** Weekday name for a Date, or null on weekends. */
export function dayOf(date: Date): SessionDay | null {
  const i = date.getDay() - 1; // Sun=0 → -1
  return i >= 0 && i < 5 ? DAY_INDEX[i] : null;
}

/**
 * A session is "late" when: it's today, the current time is past its start time
 * plus the grace period, it isn't completed, and the teacher hasn't checked in.
 */
export function isLate(session: ClassSession, now: Date, graceMin = 5): boolean {
  if (session.status === "completed") return false;
  if (session.checkedIn) return false;
  if (session.day !== dayOf(now)) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= toMinutes(session.startTime) + graceMin;
}

export interface ReassignmentItem {
  session: ClassSession;
  successor: Teacher;
}

export interface ReassignmentPlan {
  reassignments: ReassignmentItem[];
  unresolved: ClassSession[];
}

/**
 * Plans how a deleted teacher's sessions would be covered. For each session
 * (in weekday/time order) it picks the first other teacher who teaches that
 * subject AND is free in the slot. A working copy of the schedule is mutated as
 * assignments are made, so two overlapping sessions can't be given to the same
 * successor. Sessions with no candidate land in `unresolved` — callers should
 * treat a non-empty `unresolved` as "block the delete".
 */
export function planTeacherReassignment(
  deletedTeacher: Teacher,
  allTeachers: Teacher[],
  allSessions: ClassSession[],
): ReassignmentPlan {
  const isDeleted = (id: string) => id === deletedTeacher.id || id === deletedTeacher.employeeId;

  const mine = allSessions.filter((s) => isDeleted(s.teacherId));
  if (mine.length === 0) return { reassignments: [], unresolved: [] };

  const candidatesPool = allTeachers.filter((t) => !isDeleted(t.id));
  const work = allSessions.map((s) => ({ ...s }));
  const ordered = [...mine].sort(
    (a, b) =>
      DAY_INDEX.indexOf(a.day) - DAY_INDEX.indexOf(b.day) ||
      toMinutes(a.startTime) - toMinutes(b.startTime),
  );

  const reassignments: ReassignmentItem[] = [];
  const unresolved: ClassSession[] = [];

  for (const session of ordered) {
    const free = freeTeachers(candidatesPool, work, session.day, session.startTime, session.endTime, session.id);
    const successor = free.find((t) => (t.subjects ?? []).includes(session.subject));
    if (successor) {
      reassignments.push({ session, successor });
      // Mark the successor busy in this slot for subsequent iterations.
      const w = work.find((x) => x.id === session.id);
      if (w) {
        w.teacherId = successor.id;
        w.teacherName = successor.name;
      }
    } else {
      unresolved.push(session);
    }
  }

  return { reassignments, unresolved };
}
