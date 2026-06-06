import { Cpu, Wifi, WifiOff } from "lucide-react";

interface DroidEntry {
  id: string;
  serial: string;
  room: string;
  battery: number;
  status: string;
}

interface DroidStatusPanelProps {
  droids: DroidEntry[];
  uptimePercent?: number;
}

export function DroidStatusPanel({ droids, uptimePercent = 95 }: DroidStatusPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-text">Droid Status</h3>
        <span className="text-xs font-semibold text-success bg-success-bg px-2 py-0.5 rounded-full">
          {uptimePercent}% UPTIME
        </span>
      </div>

      <div className="divide-y divide-border">
        {droids.map((d) => {
          const isOffline = d.status === "offline";
          const isInactive = d.status === "inactive";
          return (
            <div key={d.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Cpu size={16} className={isOffline ? "text-error" : "text-primary"} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{d.id}</p>
                  <p className="text-xs text-muted">{d.room}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted">{d.battery}%</span>
                <div className="flex items-center gap-1">
                  {isOffline ? (
                    <WifiOff size={12} className="text-error" />
                  ) : (
                    <Wifi size={12} className={isInactive ? "text-muted" : "text-success"} />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isOffline ? "text-error" : isInactive ? "text-muted" : "text-success"
                    }`}
                  >
                    {d.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-5 py-3">
        <button className="w-full text-sm font-medium text-center text-muted hover:text-text border border-border rounded-lg py-2 hover:bg-subtle transition-colors">
          Manage Inventory
        </button>
      </div>
    </div>
  );
}
