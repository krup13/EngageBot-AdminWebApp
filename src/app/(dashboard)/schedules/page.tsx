"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Repeat2, Upload, Download, CheckCircle, AlertCircle, Wand2 } from "lucide-react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TabToggle } from "@/components/ui/TabToggle";
import { getSessions, updateSession, createSession, DAYS, SESSION_COLORS } from "@/lib/api/schedules";
import { getTeachers } from "@/lib/api/teachers";
import { getClassrooms } from "@/lib/api/classrooms";
import { getSubjects } from "@/lib/api/subjects";
import { getSettings, updateSettings } from "@/lib/api/settings";
import { createNotification } from "@/lib/api/notifications";
import { syncSchedule } from "@/lib/api/calendar";
import { getCalendarToken } from "@/lib/auth";
import { dayOf, findConflicts, freeTeachers, timeOverlap, type SessionConflict } from "@/lib/schedule-utils";
import { ClassSession, ClassGroup, Subject, SessionDay, Teacher } from "@/lib/types";

// Time options for the edit modal's Start/End dropdowns — a generous school-day
// window (07:00–19:00) so any session time can be represented.
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

// Hourly options for the recess selector.
const RECESS_OPTIONS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"];

// Grid geometry. One row = one 30-min slot. Session blocks are positioned by
// the minute (top/height derived from start/end), so anything that doesn't fall
// exactly on a half-hour still lines up with the gridlines.
const ROW_H = 28; // px per 30-min slot — must match each gridline row's height
const SLOT_MIN = 30;
const DEFAULT_START_MIN = 7 * 60; // 07:00
const DEFAULT_END_MIN = 19 * 60; // 19:00

const DAY_LABELS: Record<SessionDay, string> = {
  monday: "MON", tuesday: "TUE", wednesday: "WED", thursday: "THU", friday: "FRI",
};

type ScheduleView = "overview" | "classroom";

function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function minToLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:00`;
}

function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// Monday of the week containing `d` (local time, start of day).
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun … 6 Sat
  date.setDate(date.getDate() + ((day === 0 ? -6 : 1) - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

// ISO 8601 week number.
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// The date of weekday `index` (0 = Monday) in the week starting `weekStart`.
function dayDate(weekStart: Date, index: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + index);
  return d;
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
  const [classrooms, setClassrooms] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  // "overview" = every classroom side by side for one day; "classroom" = one classroom's week.
  const [view, setView] = useState<ScheduleView>("overview");
  const [overviewDay, setOverviewDay] = useState<SessionDay>(() => dayOf(new Date()) ?? "monday");
  const [room, setRoom] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [recessTime, setRecessTime] = useState("");
  const [savingRecess, setSavingRecess] = useState(false);
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState<SessionConflict | null>(null);

  // Edit modal
  const [editSession, setEditSession] = useState<ClassSession | null>(null);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("10:00");
  const [editSubject, setEditSubject] = useState("Science");
  const [editTeacher, setEditTeacher] = useState("");
  const [saving, setSaving] = useState(false);

  // Add-session modal (opened by clicking an empty cell, Google-Calendar style)
  const [addDraft, setAddDraft] = useState<{
    day: SessionDay;
    startTime: string;
    endTime: string;
    classGroup: string;
    subject: string;
    teacherId: string;
  } | null>(null);
  const [adding, setAdding] = useState(false);

  // Google Calendar sync
  const [syncing, setSyncing] = useState(false);
  const [calendarMsg, setCalendarMsg] = useState<string | null>(null);
  const [calendarOk, setCalendarOk] = useState(true);

  useEffect(() => {
    getSessions().then(setSessions);
    getTeachers().then(setTeachers);
    getClassrooms().then(setClassrooms);
    getSubjects().then(setSubjects);
    getSettings().then((s) => setRecessTime(s.recessTime));
  }, []);

  async function handleRecessChange(value: string) {
    setRecessTime(value);
    setSavingRecess(true);
    await updateSettings({ recessTime: value });
    setSavingRecess(false);
  }

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
  const freeForSlot = useMemo(() => {
    if (!editSession) return teachers;
    return freeTeachers(teachers, sessions, editSession.day, editStart, editEnd, editSession.id);
  }, [editSession, teachers, sessions, editStart, editEnd]);
  const editTeacherIsFree = freeForSlot.some((t) => t.id === editTeacher);
  const hasConflict = !!editTeacher && !editTeacherIsFree; // teacher double-booking
  const editRoomClash = editSession
    ? sessions.find(
        (s) =>
          s.id !== editSession.id &&
          s.classGroup === editSession.classGroup &&
          s.day === editSession.day &&
          timeOverlap(s.startTime, s.endTime, editStart, editEnd),
      )
    : undefined;
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Dropdown shows teachers who are both free in this slot AND teach the chosen
  // subject. The currently-assigned teacher is always kept visible (flagged) so
  // the select still reflects who is assigned, even if they no longer match.
  const availableForEdit = useMemo(
    () => freeForSlot.filter((t) => (t.subjects ?? []).includes(editSubject)),
    [freeForSlot, editSubject],
  );
  const currentTeacher = teachers.find((t) => t.id === editTeacher);
  const teacherOptions =
    currentTeacher && !availableForEdit.some((t) => t.id === editTeacher)
      ? [currentTeacher, ...availableForEdit]
      : availableForEdit;

  // Classroom view: one classroom's sessions across the week (first classroom until one is picked).
  const activeRoom = room || classrooms[0]?.name || "";
  const roomSessions = sessions.filter((s) => s.classGroup === activeRoom);

  // Overview: every classroom with a class on the chosen day, one column each,
  // in the classroom list's order (plus any class name no longer in that list).
  const daySessions = useMemo(() => sessions.filter((s) => s.day === overviewDay), [sessions, overviewDay]);
  const overviewColumns = useMemo(() => {
    const scheduled = new Set(daySessions.map((s) => s.classGroup));
    const known = classrooms.filter((c) => scheduled.has(c.name));
    const unknown = [...scheduled].filter((name) => !classrooms.some((c) => c.name === name)).sort();
    return [
      ...known.map((c) => ({ key: c.name, label: c.name, sublabel: c.room || undefined })),
      ...unknown.map((name) => ({ key: name, label: name })),
    ];
  }, [daySessions, classrooms]);

  // Every session involved in a conflict, with the reason (shown on hover).
  const conflictNotes = useMemo(() => {
    const notes = new Map<string, string>();
    for (const c of conflicts) {
      const msg = conflictMessage(c);
      if (!notes.has(c.a.id)) notes.set(c.a.id, msg);
      if (!notes.has(c.b.id)) notes.set(c.b.id, msg);
    }
    return notes;
  }, [conflicts]);
  const overviewConflictCount = conflicts.filter((c) => c.a.day === overviewDay).length;

  // Visible time window for the grid: a default 08:00–17:00, widened to fit any
  // session that starts earlier or ends later so nothing is clipped.
  const { gridStartMin, rowSlots } = useMemo(() => {
    let minStart = DEFAULT_START_MIN;
    let maxEnd = DEFAULT_END_MIN;
    for (const s of sessions) {
      const st = timeToMin(s.startTime);
      const en = timeToMin(s.endTime);
      if (Number.isFinite(st)) minStart = Math.min(minStart, st);
      if (Number.isFinite(en)) maxEnd = Math.max(maxEnd, en);
    }
    const start = Math.floor(minStart / 60) * 60; // pad down to the hour
    const end = Math.ceil(maxEnd / 60) * 60; // pad up to the hour
    return { gridStartMin: start, rowSlots: Math.max((end - start) / SLOT_MIN, 1) };
  }, [sessions]);
  const gridRows = Array.from({ length: rowSlots }, (_, i) => gridStartMin + i * SLOT_MIN);

  // Week navigation. Sessions are a weekly-recurring template (keyed by weekday),
  // so changing weeks shifts the displayed Mon–Fri date range; the grid content
  // is the same each week.
  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Friday
  const weekLabel = `Week ${isoWeek(weekStart)} (${fmtDate(weekStart)} – ${fmtDate(weekEnd)})`;

  function openEdit(session: ClassSession) {
    setSaveError(null);
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
    setSaveError(null);
    try {
      await updateSession(editSession.id, patch);
      setSessions((prev) => prev.map((s) => (s.id === editSession.id ? { ...s, ...patch } : s)));
      setEditSession(null);
    } catch (e) {
      // e.g. the server refuses a clash this page did not know about yet
      setSaveError(e instanceof Error ? e.message : "Could not save this class.");
    } finally {
      setSaving(false);
    }
  }

  // Open the add modal pre-filled with the clicked weekday, time (a 1-hour slot) and classroom.
  function openAdd(day: SessionDay, startMin: number, classGroup: string) {
    setAddError(null);
    setAddDraft({
      day,
      startTime: minToHHMM(startMin),
      endTime: minToHHMM(startMin + 60),
      classGroup,
      subject: "",
      teacherId: "",
    });
  }

  function patchDraft(patch: Partial<NonNullable<typeof addDraft>>) {
    setAddDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleAddSave() {
    if (!addDraft) return;
    const teacher = teachers.find((t) => t.id === addDraft.teacherId);
    setAdding(true);
    setAddError(null);
    try {
      const created = await createSession({
        subject: addDraft.subject,
        teacherId: addDraft.teacherId,
        teacherName: teacher?.name ?? "",
        classGroup: addDraft.classGroup,
        startTime: addDraft.startTime,
        endTime: addDraft.endTime,
        day: addDraft.day,
        color: SESSION_COLORS[addDraft.subject] ?? "#F3F4F6",
      });
      setSessions((prev) => [...prev, created]);
      setAddDraft(null);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add this class.");
    } finally {
      setAdding(false);
    }
  }

  // Teachers who teach the draft's subject AND are free in the draft's slot.
  const addAvailableTeachers = useMemo(() => {
    if (!addDraft) return [];
    return freeTeachers(teachers, sessions, addDraft.day, addDraft.startTime, addDraft.endTime).filter(
      (t) => (t.subjects ?? []).includes(addDraft.subject),
    );
  }, [addDraft, teachers, sessions]);

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
        <TabToggle
          tabs={[
            { label: "All classrooms (day)", value: "overview" },
            { label: "By classroom", value: "classroom" },
          ]}
          active={view}
          onChange={(v) => setView(v as ScheduleView)}
        />

        {view === "classroom" && (
          <select
            value={activeRoom}
            onChange={(e) => setRoom(e.target.value)}
            aria-label="Classroom"
            className="rounded-lg border border-border px-3 py-2 text-sm bg-surface outline-none focus:border-primary"
          >
            {classrooms.length === 0 && <option value="">No classrooms yet</option>}
            {classrooms.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Previous week"
            className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            title={weekOffset === 0 ? "Current week" : "Jump to current week"}
            className="text-sm font-medium text-text px-2 hover:text-primary transition-colors"
          >
            {weekLabel}
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Next week"
            className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle"
          >
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
            <button key={label} disabled title="Coming soon" className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-1.5 opacity-50 cursor-not-allowed">
              <Icon size={14} />
              {label}
            </button>
          ))}
          <Button
            size="sm"
            onClick={handleFinishEditing}
            loading={syncing}
            disabled={!getCalendarToken()}
            title={getCalendarToken() ? "Send this timetable to teachers' Google Calendars" : "Google Calendar sync is not connected yet"}
          >
            <CheckCircle size={14} />
            Sync to Google Calendar
          </Button>
        </div>
      </div>

      {/* Global recess time — applies to all classrooms */}
      <div className="px-6 pt-3 shrink-0">
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex-wrap">
          <span className="text-sm font-semibold text-amber-700 whitespace-nowrap">☕ School Recess Time:</span>
          <select
            value={recessTime}
            onChange={(e) => handleRecessChange(e.target.value)}
            className="text-sm border border-amber-200 rounded-lg px-3 py-1.5 bg-white text-amber-800 outline-none focus:border-amber-400"
          >
            <option value="">None</option>
            {RECESS_OPTIONS.map((h) => (
              <option key={h} value={h}>{h} – {minToHHMM(timeToMin(h) + 60)}</option>
            ))}
          </select>
          <span className="text-xs text-amber-600">
            {savingRecess
              ? "Saving…"
              : recessTime
                ? `Recess is set to ${recessTime}–${minToHHMM(timeToMin(recessTime) + 60)} for all classrooms.`
                : "No recess time set."}
          </span>
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

      {/* Calendar */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {view === "overview" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <TabToggle
                tabs={DAYS.map((d) => ({ label: DAY_LABELS[d], value: d }))}
                active={overviewDay}
                onChange={(v) => setOverviewDay(v as SessionDay)}
              />
              <span className="text-sm text-muted">
                {overviewColumns.length} classroom{overviewColumns.length === 1 ? "" : "s"} scheduled
              </span>
              {overviewConflictCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-error bg-error-bg border border-error-border rounded-full px-2.5 py-1">
                  <AlertCircle size={13} />
                  {overviewConflictCount} overlap{overviewConflictCount === 1 ? "" : "s"} on {DAY_LABELS[overviewDay]}
                </span>
              )}
            </div>

            {overviewColumns.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border px-6 py-12 text-center text-sm text-muted">
                No classes are scheduled on {DAY_LABELS[overviewDay]}. Switch to <strong>By classroom</strong> to add one.
              </div>
            ) : (
              <TimeGrid
                columns={overviewColumns}
                sessionsFor={(col) => daySessions.filter((s) => s.classGroup === col)}
                gridStartMin={gridStartMin}
                gridRows={gridRows}
                recessTime={recessTime}
                conflictNotes={conflictNotes}
                minColWidth={150}
                onCellClick={(col, min) => openAdd(overviewDay, min, col)}
                onSessionClick={openEdit}
              />
            )}
          </div>
        ) : (
          <TimeGrid
            columns={DAYS.map((d, i) => ({ key: d, label: DAY_LABELS[d], sublabel: fmtDate(dayDate(weekStart, i)) }))}
            sessionsFor={(day) => roomSessions.filter((s) => s.day === day)}
            gridStartMin={gridStartMin}
            gridRows={gridRows}
            recessTime={recessTime}
            conflictNotes={conflictNotes}
            minColWidth={128}
            onCellClick={(day, min) => openAdd(day as SessionDay, min, activeRoom)}
            onSessionClick={openEdit}
          />
        )}
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
            {saveError && (
              <p className="text-sm text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">{saveError}</p>
            )}
            {editRoomClash && (
              <div className="flex items-start gap-2.5 rounded-lg border border-error-border bg-error-bg px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <p className="text-sm text-error">
                  {editSession.classGroup} already has {editRoomClash.subject} at {editRoomClash.startTime}–{editRoomClash.endTime} on {DAY_LABELS[editSession.day]}. Pick a different time.
                </p>
              </div>
            )}
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
                {/* Keep the session's current subject selectable even if it's not in the list. */}
                {editSubject && !subjects.some((s) => s.name === editSubject) && (
                  <option value={editSubject}>{editSubject}</option>
                )}
                {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Assigned Teacher</label>
              <select
                value={editTeacher}
                onChange={(e) => setEditTeacher(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-surface outline-none focus:ring-1 ${hasConflict ? "border-error focus:ring-error text-error" : "border-border focus:border-primary focus:ring-primary"}`}
              >
                {teacherOptions.length === 0 && (
                  <option value="" disabled>No teacher teaches {editSubject} and is free in this slot</option>
                )}
                {teacherOptions.map((t) => {
                  const free = freeForSlot.some((f) => f.id === t.id);
                  const teaches = (t.subjects ?? []).includes(editSubject);
                  const note = !free ? " — busy (current)" : !teaches ? ` — doesn't teach ${editSubject} (current)` : "";
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name}{note}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-muted">
                Only teachers who teach {editSubject} and are free during {editStart}–{editEnd} on {DAY_LABELS[editSession.day]} are listed.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setEditSession(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={saving} disabled={hasConflict || !!editRoomClash}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Class Session Modal */}
      <Modal
        open={!!addDraft}
        onClose={() => setAddDraft(null)}
        title="Add Class Session"
        subtitle={addDraft ? `New block on ${DAY_LABELS[addDraft.day]} at ${addDraft.startTime}.` : undefined}
      >
        {addDraft && (() => {
          const endAfterStart = timeToMin(addDraft.endTime) > timeToMin(addDraft.startTime);
          const roomClash = sessions.find(
            (s) =>
              s.classGroup === addDraft.classGroup &&
              s.day === addDraft.day &&
              timeOverlap(s.startTime, s.endTime, addDraft.startTime, addDraft.endTime),
          );
          const valid =
            !!addDraft.classGroup && !!addDraft.subject && !!addDraft.teacherId && endAfterStart && !roomClash;
          return (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">Classroom</label>
                <select
                  value={addDraft.classGroup}
                  onChange={(e) => patchDraft({ classGroup: e.target.value })}
                  className={selectCls}
                >
                  <option value="" disabled>Select a classroom</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-text">Start Time</label>
                  <select value={addDraft.startTime} onChange={(e) => patchDraft({ startTime: e.target.value })} className={selectCls}>
                    {HOURS.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-text">End Time</label>
                  <select value={addDraft.endTime} onChange={(e) => patchDraft({ endTime: e.target.value })} className={selectCls}>
                    {HOURS.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              {!endAfterStart && (
                <p className="text-xs text-error -mt-3">End time must be after the start time.</p>
              )}
              {roomClash && (
                <p className="text-xs text-error -mt-3">
                  {addDraft.classGroup} already has {roomClash.subject} at {roomClash.startTime}–{roomClash.endTime} on {DAY_LABELS[addDraft.day]}.
                </p>
              )}
              {addError && (
                <p className="text-sm text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">{addError}</p>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">Subject</label>
                <select
                  value={addDraft.subject}
                  onChange={(e) => patchDraft({ subject: e.target.value, teacherId: "" })}
                  className={selectCls}
                >
                  <option value="" disabled>Select a subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">Assigned Teacher</label>
                <select
                  value={addDraft.teacherId}
                  onChange={(e) => patchDraft({ teacherId: e.target.value })}
                  disabled={!addDraft.subject}
                  className={`${selectCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="" disabled>
                    {!addDraft.subject
                      ? "Pick a subject first"
                      : addAvailableTeachers.length === 0
                        ? `No teacher teaches ${addDraft.subject} and is free in this slot`
                        : "Select a teacher"}
                  </option>
                  {addAvailableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {addDraft.subject && (
                  <p className="text-xs text-muted">
                    Only teachers who teach {addDraft.subject} and are free during {addDraft.startTime}–{addDraft.endTime} on {DAY_LABELS[addDraft.day]} are listed.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="ghost" onClick={() => setAddDraft(null)}>Cancel</Button>
                <Button onClick={handleAddSave} loading={adding} disabled={!valid}>Add Session</Button>
              </div>
            </div>
          );
        })()}
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

// Side-by-side placement for overlapping sessions in one column, so none is hidden
// under another. Returns each session's lane and how many lanes its overlap group uses.
function layoutLanes(sessions: ClassSession[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...sessions].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
  const result = new Map<string, { lane: number; lanes: number }>();
  let group: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const g of group) result.set(g.id, { lane: g.lane, lanes: laneEnds.length });
    group = [];
    laneEnds = [];
  };

  for (const s of sorted) {
    const start = timeToMin(s.startTime);
    const end = timeToMin(s.endTime);
    if (start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    group.push({ id: s.id, lane });
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return result;
}

type GridColumn = { key: string; label: string; sublabel?: string };

// Time grid: rows are 30-minute slots, columns are weekdays or classrooms.
function TimeGrid({
  columns,
  sessionsFor,
  gridStartMin,
  gridRows,
  recessTime,
  conflictNotes,
  minColWidth,
  onCellClick,
  onSessionClick,
}: {
  columns: GridColumn[];
  sessionsFor: (columnKey: string) => ClassSession[];
  gridStartMin: number;
  gridRows: number[];
  recessTime: string;
  conflictNotes: Map<string, string>;
  minColWidth: number;
  onCellClick: (columnKey: string, startMin: number) => void;
  onSessionClick: (session: ClassSession) => void;
}) {
  const n = columns.length;
  const template = { gridTemplateColumns: `56px repeat(${n}, minmax(0, 1fr))` };
  const colWidth = "(100% - 56px)";

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden" style={{ minWidth: 56 + n * minColWidth }}>
      <div className="grid border-b border-border" style={template}>
        <div className="py-3" />
        {columns.map((c) => (
          <div key={c.key} className="py-2.5 px-1 text-center border-l border-border">
            <p className="text-xs font-semibold text-text truncate">{c.label}</p>
            {c.sublabel && <p className="text-[11px] text-muted truncate">{c.sublabel}</p>}
          </div>
        ))}
      </div>

      <div className="relative">
        {gridRows.map((rowMin) => (
          <div key={rowMin} className="grid border-b border-border/50" style={{ ...template, height: ROW_H }}>
            <div className="pr-2 text-right text-xs text-muted self-start pt-1">
              {rowMin % 60 === 0 ? minToLabel(rowMin) : ""}
            </div>
            {columns.map((c) => (
              <div
                key={c.key}
                onClick={() => onCellClick(c.key, rowMin)}
                title={`Add a class in ${c.label} at ${minToHHMM(rowMin)}`}
                className="border-l border-border/50 relative cursor-pointer hover:bg-primary-light/40 transition-colors"
              />
            ))}
          </div>
        ))}

        {/* Recess band — spans every column at the recess hour */}
        {recessTime && Number.isFinite(timeToMin(recessTime)) && (
          <div
            className="absolute pointer-events-none flex items-center justify-center border-y border-dashed border-amber-300"
            style={{
              top: ((timeToMin(recessTime) - gridStartMin) / SLOT_MIN) * ROW_H,
              height: ROW_H * 2,
              left: 56,
              right: 0,
              backgroundColor: "rgba(245, 158, 11, 0.12)",
            }}
          >
            <span className="text-[11px] font-semibold text-amber-600">☕ RECESS</span>
          </div>
        )}

        {columns.flatMap((c, colIdx) => {
          const colSessions = sessionsFor(c.key);
          const lanes = layoutLanes(colSessions);
          return colSessions.map((session) => {
            const startMin = timeToMin(session.startTime);
            const endMin = timeToMin(session.endTime);
            if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return null;
            const { lane, lanes: laneCount } = lanes.get(session.id) ?? { lane: 0, lanes: 1 };
            const conflict = conflictNotes.get(session.id);
            const inner = `(${colWidth} / ${n} - 8px)`;

            return (
              <div
                key={session.id}
                onClick={() => onSessionClick(session)}
                title={conflict ?? `${session.subject} · ${session.classGroup} · ${session.teacherName}`}
                className={`absolute cursor-pointer rounded-lg px-2 py-1 overflow-hidden hover:opacity-90 transition-opacity ${
                  conflict ? "border-2 border-error" : "border"
                }`}
                style={{
                  top: ((startMin - gridStartMin) / SLOT_MIN) * ROW_H + 1,
                  height: ((endMin - startMin) / SLOT_MIN) * ROW_H - 2,
                  // Columns sit after the 56px time gutter; overlapping sessions share
                  // the column width in equal lanes.
                  left: `calc(56px + ${colWidth} * ${colIdx} / ${n} + 4px + ${inner} * ${lane} / ${laneCount})`,
                  width: `calc(${inner} / ${laneCount} - 2px)`,
                  backgroundColor: session.color ?? "#F3F4F6",
                  borderColor: conflict ? undefined : "rgba(0,0,0,0.08)",
                }}
              >
                <p className="text-xs font-semibold text-text truncate flex items-center gap-1">
                  {conflict && <AlertCircle size={11} className="text-error shrink-0" />}
                  {session.subject}
                </p>
                <p className="text-[11px] text-muted truncate">{session.classGroup}</p>
                <p className="text-[11px] text-muted truncate">{session.teacherName}</p>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
