"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Cpu, Wifi, WifiOff, Battery } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { getDroids } from "@/lib/api/droids";
import { Droid } from "@/lib/types";

type FilterTab = "all" | "online" | "attention";

export default function DroidsPage() {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [droids, setDroids] = useState<Droid[]>([]);

  useEffect(() => {
    getDroids().then(setDroids);
  }, []);

  const attentionDroids = droids.filter((d) => d.status === "offline" || d.battery < 20);
  const onlineDroids = droids.filter((d) => d.status === "active");

  const filtered = droids.filter((d) => {
    const matchesSearch =
      d.droidId.toLowerCase().includes(search.toLowerCase()) ||
      d.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.assignedRoom.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === "online") return d.status === "active";
    if (filterTab === "attention") return d.status === "offline" || d.battery < 20;
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Fleet Management</h2>
          <p className="text-sm text-muted mt-1">Monitor and configure Droid hardware units across school premises.</p>
        </div>
        <Link href="/register/droid">
          <Button size="sm">
            <Plus size={14} />
            Register New Droid
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, Serial, or Classroom…"
            className="rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface w-72"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          {(
            [
              { key: "all", label: `All Units (${droids.length})` },
              { key: "online", label: `Online (${onlineDroids.length})` },
              { key: "attention", label: `Attention Required (${attentionDroids.length})` },
            ] as { key: FilterTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filterTab === key
                  ? key === "attention"
                    ? "bg-error-bg text-error border border-error-border"
                    : "bg-primary text-white"
                  : "bg-surface border border-border text-muted hover:text-text"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((droid) => (
          <DroidCard key={droid.id} droid={droid} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Cpu size={36} className="text-muted mb-3" />
          <p className="text-sm font-medium text-text mb-1">No droids found</p>
          <p className="text-xs text-muted">Try adjusting your search or filter.</p>
        </div>
      )}
    </div>
  );
}

function DroidCard({ droid }: { droid: Droid }) {
  const isOffline = droid.status === "offline";
  const isInactive = droid.status === "inactive";
  const batteryColor = droid.battery > 50 ? "text-success" : droid.battery > 20 ? "text-warning" : "text-error";

  return (
    <div className={`bg-surface rounded-xl border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow
      ${isOffline ? "border-error/40" : "border-border"}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-border accent-primary" />
          <div>
            <p className="text-sm font-bold text-text">{droid.droidId}</p>
            <p className="text-xs text-muted">{droid.serialNumber}</p>
          </div>
        </div>
        <StatusBadge status={droid.status} />
      </div>

      <div className="flex items-center gap-1.5 text-sm text-text">
        <span className="text-muted">📍</span>
        {droid.assignedRoom}
      </div>

      <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-2">
        <div className="flex items-center gap-1">
          <Battery size={13} className={batteryColor} />
          <span className={`font-medium ${batteryColor}`}>{droid.battery}%</span>
          <span className="ml-1">Firmware: {droid.firmware}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted">
        {isOffline
          ? <WifiOff size={12} className="text-error" />
          : <Wifi size={12} className={isInactive ? "text-muted" : "text-success"} />
        }
        Last ping: {droid.lastPing}
      </div>
    </div>
  );
}
