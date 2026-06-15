// Google Calendar sync. The admin grants the calendar.events scope at sign-in
// (see auth.ts); the app then creates a weekly recurring event per class session
// with the teacher added as an attendee — so the teacher receives an invite on
// their own Google Calendar. Writing directly onto a teacher's calendar (no
// invite) would need Workspace domain-wide delegation + a backend (out of scope).

import type { ClassSession, SessionDay } from "@/lib/types";

const TIME_ZONE = "Asia/Kuala_Lumpur";
const BYDAY: Record<SessionDay, string> = {
  monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH", friday: "FR",
};
const DAY_NUM: Record<SessionDay, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5,
};

/** Local datetime string "YYYY-MM-DDTHH:MM:SS" for the next occurrence of `day` at `time`. */
function nextOccurrence(day: SessionDay, time: string): string {
  const now = new Date();
  const target = DAY_NUM[day];
  const diff = (target - (now.getDay() || 7) + 7) % 7; // days until next target weekday
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:00`;
}

export interface CalendarSyncResult {
  ok: boolean;
  synced: number;
  total: number;
  error?: string;
}

/** Create a recurring Calendar event for one session, inviting the teacher. */
export async function syncSessionToCalendar(
  session: ClassSession,
  teacherEmail: string,
  token: string
): Promise<void> {
  const body = {
    summary: `${session.subject} — ${session.classGroup}`,
    description: `EngageBot scheduled class. Teacher: ${session.teacherName}.`,
    start: { dateTime: nextOccurrence(session.day, session.startTime), timeZone: TIME_ZONE },
    end: { dateTime: nextOccurrence(session.day, session.endTime), timeZone: TIME_ZONE },
    recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[session.day]}`],
    attendees: teacherEmail ? [{ email: teacherEmail }] : [],
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Calendar API ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/** Sync a set of sessions; resolves teacher emails by id from the provided map. */
export async function syncSchedule(
  sessions: ClassSession[],
  teacherEmailById: Record<string, string>,
  token: string
): Promise<CalendarSyncResult> {
  let synced = 0;
  try {
    for (const s of sessions) {
      await syncSessionToCalendar(s, teacherEmailById[s.teacherId] ?? "", token);
      synced++;
    }
    return { ok: true, synced, total: sessions.length };
  } catch (e) {
    return { ok: false, synced, total: sessions.length, error: (e as Error).message };
  }
}
