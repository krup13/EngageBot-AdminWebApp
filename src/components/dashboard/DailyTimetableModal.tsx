"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { getSessions, DAYS } from "@/lib/api/schedules";
import { toMinutes } from "@/lib/schedule-utils";
import type { ClassSession, SessionDay } from "@/lib/types";

const WEEKDAY = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Trigger button + modal that pages through each classroom's timetable for the day. */
export function DailyTimetableModal() {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) getSessions().then(setSessions);
  }, [open]);

  const today = WEEKDAY[new Date().getDay()];
  const day = (DAYS.includes(today as SessionDay) ? today : "monday") as SessionDay;

  // Classrooms (class groups) that have at least one session today.
  const classrooms = useMemo(() => {
    const todays = sessions.filter((s) => s.day === day);
    return [...new Set(todays.map((s) => s.classGroup))].sort();
  }, [sessions, day]);

  const current = classrooms[index];
  const rows = useMemo(
    () =>
      sessions
        .filter((s) => s.day === day && s.classGroup === current)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [sessions, day, current]
  );

  function move(delta: number) {
    setIndex((i) => (classrooms.length ? (i + delta + classrooms.length) % classrooms.length : 0));
  }

  return (
    <>
      <button
        onClick={() => { setIndex(0); setOpen(true); }}
        className="text-xs text-primary hover:underline font-medium"
      >
        View Full Daily Timetable
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Daily Timetable"
        subtitle={`${day[0].toUpperCase() + day.slice(1)} · by classroom`}
      >
        {classrooms.length === 0 ? (
          <p className="text-sm text-muted">No classes scheduled today.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Classroom pager */}
            <div className="flex items-center justify-between">
              <button onClick={() => move(-1)} className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-text">{current}</p>
                <p className="text-xs text-muted">{index + 1} of {classrooms.length} classrooms</p>
              </div>
              <button onClick={() => move(1)} className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Sessions for this classroom */}
            <div className="flex flex-col gap-2">
              {rows.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                  <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: s.color ?? "#E5E7EB" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{s.subject}</p>
                    <p className="text-xs text-muted truncate">{s.teacherName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                    <Clock size={13} />
                    {s.startTime}–{s.endTime}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
