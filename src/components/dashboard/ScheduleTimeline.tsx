"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

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

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17];

const MOCK_TIMELINE: TimelineRow[] = [
  {
    classGroup: "Class 4A",
    sessions: [
      { id: "1", subject: "Biology", teacher: "En. Rosli", startHour: 11.5, endHour: 12.5, color: "#D1FAE5" },
      { id: "2", subject: "History", teacher: "Pn. Siti", startHour: 14, endHour: 15, color: "#F3F4F6" },
    ],
  },
  {
    classGroup: "Class 5C",
    sessions: [
      { id: "3", subject: "Add Maths", teacher: "En. Tan", startHour: 11, endHour: 12.5, color: "#FEF3C7" },
      { id: "4", subject: "P. Islam", teacher: "Ustaz H.", startHour: 15, endHour: 16, color: "#ECFDF5" },
    ],
  },
];

const TIME_START = 10;
const TIME_END = 17;
const TOTAL_HOURS = TIME_END - TIME_START;

export function ScheduleTimeline() {
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
        {/* Time header */}
        <div className="flex">
          <div className="w-24 shrink-0" />
          <div className="flex-1 flex">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-xs text-muted text-center pb-2">
                {h}:00
              </div>
            ))}
          </div>
        </div>

        {/* Timeline rows */}
        <div className="flex flex-col gap-3">
          {MOCK_TIMELINE.map((row) => (
            <div key={row.classGroup} className="flex items-center gap-0">
              <div className="w-24 shrink-0 text-xs font-medium text-text pr-3">{row.classGroup}</div>
              <div className="flex-1 relative h-10 bg-subtle rounded border border-border">
                {row.sessions.map((s) => {
                  const leftPct = ((s.startHour - TIME_START) / TOTAL_HOURS) * 100;
                  const widthPct = ((s.endHour - s.startHour) / TOTAL_HOURS) * 100;
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
      </div>
    </div>
  );
}
