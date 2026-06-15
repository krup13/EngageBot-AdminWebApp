import { Clock, Filter } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { DailyTimetableModal } from "@/components/dashboard/DailyTimetableModal";
import { ClassSession } from "@/lib/types";

interface TeachingSessionsTableProps {
  sessions: ClassSession[];
}

export function TeachingSessionsTable({ sessions }: TeachingSessionsTableProps) {
  return (
    <div className="bg-surface rounded-xl border border-border">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Today&#39;s Teaching Sessions</h3>
          <p className="text-xs text-muted mt-0.5">Live update of ongoing and upcoming classes</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-muted hover:text-text border border-border rounded-lg px-3 py-1.5">
          <Filter size={14} />
          Filter
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-t border-border">
            <th className="text-left text-xs font-medium text-muted px-5 py-2.5">TEACHER</th>
            <th className="text-left text-xs font-medium text-muted px-4 py-2.5">CLASS &amp; SUBJECT</th>
            <th className="text-left text-xs font-medium text-muted px-4 py-2.5">TIME SLOT</th>
            <th className="text-left text-xs font-medium text-muted px-4 py-2.5">STATUS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-subtle transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {s.teacherName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-text">{s.teacherName}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-text">{s.classGroup}</p>
                <p className="text-xs text-muted">{s.subject}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-muted text-xs">
                  <Clock size={13} />
                  {s.startTime} – {s.endTime}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-border px-5 py-3 text-center">
        <DailyTimetableModal />
      </div>
    </div>
  );
}
