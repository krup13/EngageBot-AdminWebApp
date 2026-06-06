import { BarChart2 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-4">
        <BarChart2 size={32} className="text-primary" />
      </div>
      <h2 className="text-xl font-bold text-text mb-2">Reports</h2>
      <p className="text-sm text-muted max-w-xs">
        Engagement analytics, attendance summaries, and session reports will be available here once Firebase integration is complete.
      </p>
    </div>
  );
}
