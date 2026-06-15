import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext?: string;
  live?: boolean;
}

export function StatCard({ icon: Icon, label, value, subtext, live }: StatCardProps) {
  return (
    <div className="bg-surface rounded-xl p-5 flex flex-col gap-3 border border-border">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
          <Icon size={20} className="text-primary" />
        </div>
        {live && (
          <span className="text-xs font-medium text-muted uppercase tracking-wide">Live</span>
        )}
      </div>
      <div>
        <p className="text-sm text-muted mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-text">{value}</p>
        {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
      </div>
    </div>
  );
}
