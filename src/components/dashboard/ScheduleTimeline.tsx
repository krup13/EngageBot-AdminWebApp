"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClassSession } from "@/lib/types";

interface TimelineSession {
  id: string;
  subject: string;
  teacher: string;
  startHour: number;
  endHour: number;
  color: string;
}

interface TimelineRow {
  classGroup: string;
  sessions: TimelineSession[];
}

// "HH:MM" → decimal hours (e.g. "09:30" → 9.5). Returns NaN on malformed input.
function toHours(time: string): number {
  const [h, m] = (time ?? "").split(":").map(Number);
  return h + (Number.isFinite(m) ? m : 0) / 60;
}

// Group the day's sessions into one row per class group, sorted by start time.
function buildRows(sessions: ClassSession[]): TimelineRow[] {
  const byGroup = new Map<string, TimelineSession[]>();
  for (const s of sessions) {
    const startHour = toHours(s.startTime);
    const endHour = toHours(s.endTime);
    if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) continue;
    if (!byGroup.has(s.classGroup)) byGroup.set(s.classGroup, []);
    byGroup.get(s.classGroup)!.push({
      id: s.id,
      subject: s.subject,
      teacher: s.teacherName,
      startHour,
      endHour,
      color: s.color ?? "#F3F4F6",
    });
  }
  return Array.from(byGroup.entries()).map(([classGroup, rowSessions]) => ({
    classGroup,
    sessions: rowSessions.sort((a, b) => a.startHour - b.startHour),
  }));
}

export function ScheduleTimeline({ sessions }: { sessions: ClassSession[] }) {
  const rows = buildRows(sessions);

  // Derive the visible time window from the data, padded out to whole hours.
  const all = rows.flatMap((r) => r.sessions);
  const timeStart = all.length ? Math.floor(Math.min(...all.map((s) => s.startHour))) : 8;
  const timeEnd = all.length ? Math.ceil(Math.max(...all.map((s) => s.endHour))) : 17;
  const totalHours = Math.max(timeEnd - timeStart, 1);
  const hours = Array.from({ length: totalHours }, (_, i) => timeStart + i);

  return (
    <div className="bg-surface rounded-xl border border-border">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Upcoming Schedules Today</h3>
          <p className="text-xs text-muted mt-0.5">Visual timeline of today&#39;s remaining classroom sessions</p>
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-subtle transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-5 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">No sessions scheduled for today.</p>
        ) : (
          <>
            {/* Time header */}
            <div className="flex">
              <div className="w-24 shrink-0" />
              <div className="flex-1 flex">
                {hours.map((h) => (
                  <div key={h} className="flex-1 text-xs text-muted text-center pb-2">
                    {h}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline rows */}
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <div key={row.classGroup} className="flex items-center gap-0">
                  <div className="w-24 shrink-0 text-xs font-medium text-text pr-3">{row.classGroup}</div>
                  <div className="flex-1 relative h-10 bg-subtle rounded border border-border">
                    {row.sessions.map((s) => {
                      const leftPct = ((s.startHour - timeStart) / totalHours) * 100;
                      const widthPct = ((s.endHour - s.startHour) / totalHours) * 100;
                      return (
                        <div
                          key={s.id}
                          className="absolute top-1 bottom-1 rounded px-1.5 flex items-center overflow-hidden"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: s.color,
                            borderLeft: "3px solid rgba(0,0,0,0.1)",
                          }}
                        >
                          <span className="text-xs text-text truncate font-medium">
                            {s.subject} • {s.teacher}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
