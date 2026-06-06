"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Repeat2, Upload, Download, CheckCircle } from "lucide-react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AlertCircle } from "lucide-react";
import { MOCK_SESSIONS, DAYS, SESSION_COLORS } from "@/lib/api/schedules";
import { ClassSession, SessionDay } from "@/lib/types";

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const DAY_LABELS: Record<SessionDay, string> = {
  monday: "MON",
  tuesday: "TUE",
  wednesday: "WED",
  thursday: "THU",
  friday: "FRI",
};

const ROOM_OPTIONS = ["Block A - Room 101", "Block A - Room 102", "Block B - Room 201", "All Rooms"];
const TEACHER_OPTIONS = [
  { id: "t1", name: "Aisha Binti Rahman", subject: "TCHR-1001 — Science", hasConflict: true },
  { id: "t2", name: "Muhammad Hakim Bin Ismail", subject: "TCHR-1002 — Mathematics", hasConflict: false },
  { id: "t3", name: "Lim Wei Jun", subject: "TCHR-1003 — English", hasConflict: false },
];

const SUBJECT_OPTIONS = ["Mathematics", "Science", "English Language", "Bahasa Melayu", "Chemistry", "Biology", "History", "Add Maths", "P. Islam"];

function timeToRow(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - 8) * 2 + (m >= 30 ? 1 : 0);
}

export default function SchedulesPage() {
  const [room] = useState("Block A - Room 101");
  const [conflictVisible, setConflictVisible] = useState(true);
  const [editSession, setEditSession] = useState<ClassSession | null>(null);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("10:00");
  const [editSubject, setEditSubject] = useState("Science");
  const [editTeacher, setEditTeacher] = useState("t1");

  const selectedTeacher = TEACHER_OPTIONS.find((t) => t.id === editTeacher);
  const hasConflict = selectedTeacher?.hasConflict ?? false;

  function openEdit(session: ClassSession) {
    setEditSession(session);
    setEditStart(session.startTime);
    setEditEnd(session.endTime);
    setEditSubject(session.subject);
    setEditTeacher("t1");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap shrink-0">
        <select className="rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:border-primary">
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
            <button
              key={label}
              className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-1.5 hover:text-text hover:bg-subtle transition-colors"
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
          <Button size="sm">
            <CheckCircle size={14} />
            Finish Editing →
          </Button>
        </div>
      </div>

      {/* Conflict banner */}
      {conflictVisible && (
        <div className="px-6 pt-3 shrink-0">
          <AlertBanner
            variant="warning"
            title="Double-booking Conflict Detected"
            message="Cikgu Ahmad is assigned to Room 102 during the 08:00 – 09:30 Monday slot."
            onDismiss={() => setConflictVisible(false)}
            actions={
              <button className="text-xs font-semibold text-warning bg-warning-bg border border-warning-border px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors whitespace-nowrap">
                Resolve Now
              </button>
            }
          />
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-xl border border-border overflow-hidden min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-[56px_repeat(5,1fr)] border-b border-border">
            <div className="py-3" />
            {DAYS.map((day) => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-muted border-l border-border">
                {DAY_LABELS[day]}
              </div>
            ))}
          </div>

          {/* Time rows */}
          <div className="relative">
            {HOURS.map((time, rowIdx) => (
              <div key={time} className="grid grid-cols-[56px_repeat(5,1fr)] border-b border-border/50">
                <div className="py-1 pr-2 text-right text-xs text-muted self-start pt-1.5">
                  {time.endsWith("00") ? time : ""}
                </div>
                {DAYS.map((day) => (
                  <div key={day} className="border-l border-border/50 min-h-[28px] relative" />
                ))}
              </div>
            ))}

            {/* Session blocks overlay */}
            {MOCK_SESSIONS.map((session) => {
              const startRow = timeToRow(session.startTime);
              const endRow = timeToRow(session.endTime);
              const dayIdx = DAYS.indexOf(session.day);
              if (dayIdx === -1) return null;
              const topPx = startRow * 28;
              const heightPx = (endRow - startRow) * 28;
              const leftPct = (dayIdx / 5) * 100;
              const widthPct = (1 / 5) * 100;

              return (
                <div
                  key={session.id}
                  onClick={() => openEdit(session)}
                  className="absolute cursor-pointer rounded-lg mx-1 px-2 py-1 border overflow-hidden hover:opacity-90 transition-opacity"
                  style={{
                    top: topPx + 1,
                    height: heightPx - 2,
                    left: `calc(56px + ${leftPct}%)`,
                    width: `calc(${widthPct}% - 8px)`,
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
        subtitle={editSession ? `Adjust the timeframe, subject, and teacher for this specific block in ${editSession.classGroup}.` : undefined}
      >
        {editSession && (
          <div className="flex flex-col gap-5">
            {hasConflict && (
              <div className="flex items-start gap-2.5 rounded-lg border border-error-border bg-error-bg px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-error">Double-booking detected</p>
                  <p className="text-xs text-error mt-0.5">
                    Teacher <strong>{selectedTeacher?.name}</strong> is already scheduled for {editSession.classGroup} at 09:00. Please select an alternative time or a different educator.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">Start Time</label>
                <select
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2.5 text-sm bg-white outline-none focus:border-primary"
                >
                  {HOURS.filter((_, i) => i % 2 === 0).map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text flex justify-between">
                  End Time
                  <span className="text-xs text-muted font-normal">Duration: 60 mins</span>
                </label>
                <select
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2.5 text-sm bg-white outline-none focus:border-primary"
                >
                  {HOURS.filter((_, i) => i % 2 === 0).map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Subject</label>
              <select
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="rounded-lg border border-border px-3 py-2.5 text-sm bg-white outline-none focus:border-primary"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Assigned Teacher</label>
              <div className="relative">
                <select
                  value={editTeacher}
                  onChange={(e) => setEditTeacher(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-white outline-none focus:ring-1 ${hasConflict ? "border-error focus:ring-error text-error" : "border-border focus:border-primary focus:ring-primary"}`}
                >
                  {TEACHER_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setEditSession(null)}>Cancel</Button>
              <Button disabled={hasConflict}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
