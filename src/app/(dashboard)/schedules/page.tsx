"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Repeat2, Upload, Download, CheckCircle, AlertCircle, Wand2 } from "lucide-react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getSessions, updateSession, DAYS, SESSION_COLORS } from "@/lib/api/schedules";
import { getTeachers } from "@/lib/api/teachers";
import { createNotification } from "@/lib/api/notifications";
import { syncSchedule } from "@/lib/api/calendar";
import { getCalendarToken } from "@/lib/auth";
import { findConflicts, freeTeachers, type SessionConflict } from "@/lib/schedule-utils";
import { ClassSession, SessionDay, Teacher } from "@/lib/types";

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const DAY_LABELS: Record<SessionDay, string> = {
  monday: "MON", tuesday: "TUE", wednesday: "WED", thursday: "THU", friday: "FRI",
};

const ROOM_OPTIONS = ["All Rooms", "Block A - Room 101", "Block A - Room 102", "Block B - Room 201"];
const SUBJECT_OPTIONS = ["Mathematics", "Science", "English Language", "Bahasa Melayu", "Chemistry", "Biology", "History", "Add Maths", "P. Islam"];

function timeToRow(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - 8) * 2 + (m >= 30 ? 1 : 0);
}

function conflictMessage(c: SessionConflict): string {
  const day = c.a.day[0].toUpperCase() + c.a.day.slice(1);
  if (c.reason === "teacher") {
    return `${c.a.teacherName} is double-booked: ${c.a.subject} (${c.a.classGroup}) and ${c.b.subject} (${c.b.classGroup}) overlap on ${day} around ${c.b.startTime}.`;
  }
  return `${c.a.classGroup} has two classes at once: ${c.a.subject} and ${c.b.subject} overlap on ${day} around ${c.b.startTime}.`;
}

export default function SchedulesPage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [room, setRoom] = useState("All Rooms");
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState<SessionConflict | null>(null);

  // Edit modal
  const [editSession, setEditSession] = useState<ClassSession | null>(null);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("10:00");
  const [editSubject, setEditSubject] = useState("Science");
  const [editTeacher, setEditTeacher] = useState("");
  const [saving, setSaving] = useState(false);

  // Google Calendar sync
  const [syncing, setSyncing] = useState(false);
  const [calendarMsg, setCalendarMsg] = useState<string | null>(null);
  const [calendarOk, setCalendarOk] = useState(true);

  useEffect(() => {
    getSessions().then(setSessions);
    getTeachers().then(setTeachers);
  }, []);

  async function handleFinishEditing() {
    const token = getCalendarToken();
    if (!token) {
      setCalendarOk(false);
      setCalendarMsg("Google Calendar sync needs sign-in with calendar access (unavailable in dev-bypass mode).");
      return;
    }
    const emailById: Record<string, string> = {};
    teachers.forEach((t) => { emailById[t.id] = t.email; });
    setSyncing(true);
    const result = await syncSchedule(sessions, emailById, token);
    setSyncing(false);
    setCalendarOk(result.ok);
    setCalendarMsg(
      result.ok
        ? `Synced ${result.synced} class${result.synced === 1 ? "" : "es"} to Google Calendar — teachers invited.`
        : `Calendar sync stopped after ${result.synced}/${result.total}: ${result.error}`
    );
  }

  const conflicts = useMemo(() => findConflicts(sessions), [sessions]);
  const activeConflict = conflicts.find((c) => !dismissedConflicts.has(c.a.id + c.b.id));

  // Teachers free for the slot being edited (excludes the session itself).
  const availableForEdit = useMemo(() => {
    if (!editSession) return teachers;
    return freeTeachers(teachers, sessions, editSession.day, editStart, editEnd, editSession.id);
  }, [editSession, teachers, sessions, editStart, editEnd]);
  const editTeacherIsFree = availableForEdit.some((t) => t.id === editTeacher);
  const hasConflict = !!editTeacher && !editTeacherIsFree;

  const visibleSessions = sessions; // room filter is display-only; all rooms by default

  function openEdit(session: ClassSession) {
    setEditSession(session);
    setEditStart(session.startTime);
    setEditEnd(session.endTime);
    setEditSubject(session.subject);
    setEditTeacher(session.teacherId);
  }

  async function handleSaveEdit() {
    if (!editSession) return;
    const teacher = teachers.find((t) => t.id === editTeacher);
    const patch = {
      subject: editSubject,
      startTime: editStart,
      endTime: editEnd,
      teacherId: editTeacher,
      teacherName: teacher?.name ?? editSession.teacherName,
      color: SESSION_COLORS[editSubject] ?? "#F3F4F6",
    };
    setSaving(true);
    await updateSession(editSession.id, patch);
    setSessions((prev) => prev.map((s) => (s.id === editSession.id ? { ...s, ...patch } : s)));
    setSaving(false);
    setEditSession(null);
  }

  // Reassign one side of a conflict to a free teacher + notify them (relief).
  async function reassign(conflict: SessionConflict, teacher: Teacher) {
    const target = conflict.b; // reassign the second session
    const patch = { teacherId: teacher.id, teacherName: teacher.name };
    await updateSession(target.id, patch);
    setSessions((prev) => prev.map((s) => (s.id === target.id ? { ...s, ...patch } : s)));
    await createNotification({
      teacherId: teacher.id,
      type: "relief",
      message: `You've been assigned a relief class: ${target.subject} for ${target.classGroup} on ${target.day} ${target.startTime}–${target.endTime}.`,
      sessionId: target.id,
    });
    setResolving(null);
  }

  const selectCls = "rounded-lg border border-border px-3 py-2.5 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-surface border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap shrink-0">
        <select value={room} onChange={(e) => setRoom(e.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm bg-surface outline-none focus:border-primary">
          {ROOM_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-2">
          <button className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-text px-2">Week 12 (Mar 23 – Mar 27)</span>
          <button className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {[
            { label: "Copy Week", icon: Copy },
            { label: "Repeat to Next", icon: Repeat2 },
            { label: "Import CSV", icon: Upload },
            { label: "Export CSV", icon: Download },
          ].map(({ label, icon: Icon }) => (
            <button key={label} className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-1.5 hover:text-text hover:bg-subtle transition-colors">
              <Icon size={14} />
              {label}
            </button>
          ))}
          <Button size="sm" onClick={handleFinishEditing} loading={syncing}>
            <CheckCircle size={14} />
            Finish Editing →
          </Button>
        </div>
      </div>

      {/* Calendar sync status */}
      {calendarMsg && (
        <div className="px-6 pt-3 shrink-0">
          <AlertBanner
            variant={calendarOk ? "success" : "info"}
            message={calendarMsg}
            onDismiss={() => setCalendarMsg(null)}
          />
        </div>
      )}

      {/* Conflict banner — real, computed from the schedule */}
      {activeConflict && (
        <div className="px-6 pt-3 shrink-0">
          <AlertBanner
            variant="warning"
            title="Double-booking Conflict Detected"
            message={conflictMessage(activeConflict)}
            onDismiss={() => setDismissedConflicts((p) => new Set(p).add(activeConflict.a.id + activeConflict.b.id))}
            actions={
              <button
                onClick={() => setResolving(activeConflict)}
                className="text-xs font-semibold text-warning bg-warning-bg border border-warning-border px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors whitespace-nowrap"
              >
                Resolve Now
              </button>
            }
          />
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-surface rounded-xl border border-border overflow-hidden min-w-[700px]">
          <div className="grid grid-cols-[56px_repeat(5,1fr)] border-b border-border">
            <div className="py-3" />
            {DAYS.map((day) => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-muted border-l border-border">
                {DAY_LABELS[day]}
              </div>
            ))}
          </div>

          <div className="relative">
            {HOURS.map((time) => (
              <div key={time} className="grid grid-cols-[56px_repeat(5,1fr)] border-b border-border/50">
                <div className="py-1 pr-2 text-right text-xs text-muted self-start pt-1.5">
                  {time.endsWith("00") ? time : ""}
                </div>
                {DAYS.map((day) => (
                  <div key={day} className="border-l border-border/50 min-h-[28px] relative" />
                ))}
              </div>
            ))}

            {visibleSessions.map((session) => {
              const startRow = timeToRow(session.startTime);
              const endRow = timeToRow(session.endTime);
              const dayIdx = DAYS.indexOf(session.day);
              if (dayIdx === -1) return null;
              const topPx = startRow * 28;
              const heightPx = (endRow - startRow) * 28;

              return (
                <div
                  key={session.id}
                  onClick={() => openEdit(session)}
                  className="absolute cursor-pointer rounded-lg px-2 py-1 border overflow-hidden hover:opacity-90 transition-opacity"
                  style={{
                    top: topPx + 1,
                    height: heightPx - 2,
                    // Day columns occupy the width AFTER the 56px time gutter, so the
                    // column math must be based on (100% - 56px), not the full width.
                    left: `calc(56px + (100% - 56px) * ${dayIdx} / 5 + 4px)`,
                    width: `calc((100% - 56px) / 5 - 8px)`,
                    backgroundColor: session.color ?? "#F3F4F6",
                    borderColor: "rgba(0,0,0,0.08)",
                  }}
                >
                  <p className="text-xs font-semibold text-text truncate">{session.subject}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-primary-light flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                      {session.teacherName.charAt(0)}
                    </div>
                    <p className="text-[11px] text-muted truncate">{session.teacherName}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Class Slot Modal */}
      <Modal
        open={!!editSession}
        onClose={() => setEditSession(null)}
        title="Edit Class Slot"
        subtitle={editSession ? `Adjust the timeframe, subject, and teacher for this block in ${editSession.classGroup}.` : undefined}
      >
        {editSession && (
          <div className="flex flex-col gap-5">
            {hasConflict && (
              <div className="flex items-start gap-2.5 rounded-lg border border-error-border bg-error-bg px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-error">Double-booking detected</p>
                  <p className="text-xs text-error mt-0.5">
                    {teachers.find((t) => t.id === editTeacher)?.name} already has a class overlapping {editStart}–{editEnd} on {editSession.day}. Pick a free teacher or change the time.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">Start Time</label>
                <select value={editStart} onChange={(e) => setEditStart(e.target.value)} className={selectCls}>
                  {HOURS.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">End Time</label>
                <select value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className={selectCls}>
                  {HOURS.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Subject</label>
              <select value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className={selectCls}>
                {SUBJECT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Assigned Teacher</label>
              <select
                value={editTeacher}
                onChange={(e) => setEditTeacher(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-surface outline-none focus:ring-1 ${hasConflict ? "border-error focus:ring-error text-error" : "border-border focus:border-primary focus:ring-primary"}`}
              >
                {teachers.map((t) => {
                  const free = availableForEdit.some((f) => f.id === t.id);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name}{free ? "" : " — busy"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setEditSession(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={saving} disabled={hasConflict}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Resolve Conflict Modal */}
      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title="Resolve Scheduling Conflict"
        subtitle={resolving ? conflictMessage(resolving) : undefined}
      >
        {resolving && (
          <ResolveConflict conflict={resolving} teachers={teachers} sessions={sessions} onReassign={reassign} />
        )}
      </Modal>
    </div>
  );
}

function ResolveConflict({
  conflict,
  teachers,
  sessions,
  onReassign,
}: {
  conflict: SessionConflict;
  teachers: Teacher[];
  sessions: ClassSession[];
  onReassign: (c: SessionConflict, t: Teacher) => Promise<void>;
}) {
  const target = conflict.b;
  const available = freeTeachers(teachers, sessions, target.day, target.startTime, target.endTime, target.id);
  const [manualId, setManualId] = useState(available[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function go(teacher: Teacher | undefined) {
    if (!teacher) return;
    setBusy(true);
    await onReassign(conflict, teacher);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-subtle rounded-lg border border-border p-3 text-sm">
        <p className="text-text">
          Reassigning <strong>{target.subject}</strong> ({target.classGroup}), {target.day} {target.startTime}–{target.endTime}.
        </p>
      </div>

      {available.length === 0 ? (
        <p className="text-sm text-muted">No teachers are free in this slot. Change the time instead, or free up a teacher.</p>
      ) : (
        <>
          {/* Auto-resolve */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-text flex items-center gap-1.5"><Wand2 size={14} className="text-primary" />Auto-resolve</p>
              <p className="text-xs text-muted mt-0.5">Assign the first free teacher ({available[0].name}) and notify them.</p>
            </div>
            <Button size="sm" onClick={() => go(available[0])} loading={busy}>Auto-assign</Button>
          </div>

          {/* Manual */}
          <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-text">Or choose a replacement</p>
            <select
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="rounded-lg border border-border px-3 py-2.5 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {available.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.department}</option>
              ))}
            </select>
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => go(available.find((t) => t.id === manualId))} loading={busy}>
                Assign &amp; notify
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
