"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Cpu, Wifi, WifiOff, Battery, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { getDroids, updateDroid, deleteDroid } from "@/lib/api/droids";
import { getClassrooms } from "@/lib/api/classrooms";
import { ClassGroup, Droid } from "@/lib/types";

type FilterTab = "all" | "online" | "attention";

const UNASSIGNED = "Unassigned";

// Battery and last ping are reported by the droid itself; before its first heartbeat
// there is nothing real to show.
const hasReported = (d: Droid) => !!d.lastPingAt;
const needsAttention = (d: Droid) => d.status === "offline" || (hasReported(d) && d.battery < 20);

const fieldCls =
  "w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export default function DroidsPage() {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [droids, setDroids] = useState<Droid[]>([]);
  const [classrooms, setClassrooms] = useState<ClassGroup[]>([]);

  // Edit modal
  const [editing, setEditing] = useState<Droid | null>(null);
  const [editSerial, setEditSerial] = useState("");
  const [editRoom, setEditRoom] = useState(UNASSIGNED);
  const [editFirmware, setEditFirmware] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("inactive");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation
  const [deleting, setDeleting] = useState<Droid | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getDroids().then(setDroids);
    getClassrooms().then(setClassrooms);
  }, []);

  const attentionDroids = droids.filter(needsAttention);
  const onlineDroids = droids.filter((d) => d.status === "active");

  const filtered = droids.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      d.droidId.toLowerCase().includes(q) ||
      d.serialNumber.toLowerCase().includes(q) ||
      d.assignedRoom.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterTab === "online") return d.status === "active";
    if (filterTab === "attention") return needsAttention(d);
    return true;
  });

  function openEdit(droid: Droid) {
    setEditing(droid);
    setEditSerial(droid.serialNumber);
    setEditRoom(droid.assignedRoom || UNASSIGNED);
    setEditFirmware(droid.firmware);
    setEditStatus(droid.status === "inactive" ? "inactive" : "active");
    setEditNotes(droid.telemetryNotes ?? "");
    setEditError(null);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editSerial.trim()) {
      setEditError("Serial number is required.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await updateDroid(editing.id, {
        serialNumber: editSerial.trim(),
        assignedRoom: editRoom,
        firmware: editFirmware.trim(),
        // An "offline" droid stays as it is unless the admin changes the status.
        ...(editing.status === "offline" && editStatus === "active" ? {} : { status: editStatus }),
        telemetryNotes: editNotes.trim(),
      });
      // Reload both lists: moving a droid can unassign another droid from that classroom.
      const [fresh, rooms] = await Promise.all([getDroids(), getClassrooms()]);
      setDroids(fresh);
      setClassrooms(rooms);
      setEditing(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save the droid.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setRemoving(true);
    setDeleteError(null);
    try {
      await deleteDroid(deleting.id);
      setDroids((prev) => prev.filter((d) => d.id !== deleting.id));
      setDeleting(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete the droid.");
    } finally {
      setRemoving(false);
    }
  }

  // Classrooms that already have another droid, so the picker can say so.
  const otherDroidIn = (roomName: string) =>
    droids.find((d) => d.assignedRoom === roomName && d.id !== editing?.id)?.droidId;

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
          <DroidCard key={droid.id} droid={droid} onEdit={() => openEdit(droid)} onDelete={() => { setDeleteError(null); setDeleting(droid); }} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Cpu size={36} className="text-muted mb-3" />
          <p className="text-sm font-medium text-text mb-1">No droids found</p>
          <p className="text-xs text-muted">
            {droids.length === 0 ? "Register a droid to start monitoring a classroom." : "Try adjusting your search or filter."}
          </p>
        </div>
      )}

      {/* Edit droid */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.droidId}` : "Edit droid"}
        subtitle="Battery and last ping are reported by the droid and can't be edited."
      >
        {editing && (
          <div className="flex flex-col gap-4">
            {editError && (
              <p className="text-sm text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">{editError}</p>
            )}

            <Input label="Serial number" value={editSerial} onChange={(e) => setEditSerial(e.target.value)} />

            <div className="flex flex-col gap-1">
              <label htmlFor="droid-room" className="text-sm font-medium text-text">Classroom</label>
              <select id="droid-room" value={editRoom} onChange={(e) => setEditRoom(e.target.value)} className={fieldCls}>
                <option value={UNASSIGNED}>Unassigned</option>
                {classrooms.map((c) => {
                  const other = otherDroidIn(c.name);
                  return (
                    <option key={c.id} value={c.name}>
                      {c.name}{c.room ? ` · ${c.room}` : ""}{other ? ` (has ${other})` : ""}
                    </option>
                  );
                })}
                {editRoom !== UNASSIGNED && !classrooms.some((c) => c.name === editRoom) && (
                  <option value={editRoom}>{editRoom} (no longer a classroom)</option>
                )}
              </select>
              {otherDroidIn(editRoom) && (
                <p className="text-xs text-warning">
                  {otherDroidIn(editRoom)} will be unassigned from {editRoom}. A classroom has one droid.
                </p>
              )}
            </div>

            <Input label="Firmware" value={editFirmware} onChange={(e) => setEditFirmware(e.target.value)} />

            <div className="flex flex-col gap-1">
              <label htmlFor="droid-status" className="text-sm font-medium text-text">Status</label>
              <select
                id="droid-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                className={fieldCls}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive (out of service)</option>
              </select>
              <p className="text-xs text-muted">A droid that stops sending heartbeats shows as offline automatically.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="droid-notes" className="text-sm font-medium text-text">Notes</label>
              <textarea
                id="droid-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className={fieldCls}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete droid */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.droidId}?` : "Delete droid?"}
      >
        {deleting && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">
              {deleting.droidId} ({deleting.serialNumber}) will be removed from the fleet
              {deleting.assignedRoom && deleting.assignedRoom !== UNASSIGNED ? ` and unassigned from ${deleting.assignedRoom}` : ""}.
              Past session reports keep its ID. This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={removing}>Delete Droid</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DroidCard({ droid, onEdit, onDelete }: { droid: Droid; onEdit: () => void; onDelete: () => void }) {
  const isOffline = droid.status === "offline";
  const isInactive = droid.status === "inactive";
  const reported = hasReported(droid);
  const batteryColor = !reported
    ? "text-muted"
    : droid.battery > 50 ? "text-success" : droid.battery > 20 ? "text-warning" : "text-error";

  return (
    <div className={`bg-surface rounded-xl border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow
      ${isOffline ? "border-error/40" : "border-border"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-text">{droid.droidId}</p>
          <p className="text-xs text-muted truncate">{droid.serialNumber}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusBadge status={droid.status} />
          <button onClick={onEdit} title={`Edit ${droid.droidId}`} aria-label={`Edit ${droid.droidId}`} className="text-muted hover:text-text p-1.5 rounded transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} title={`Delete ${droid.droidId}`} aria-label={`Delete ${droid.droidId}`} className="text-muted hover:text-error p-1.5 rounded transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-text">
        <span className="text-muted">📍</span>
        {droid.assignedRoom || UNASSIGNED}
      </div>

      <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-2">
        <div className="flex items-center gap-1">
          <Battery size={13} className={batteryColor} />
          <span className={`font-medium ${batteryColor}`}>{reported ? `${droid.battery}%` : "—"}</span>
          <span className="ml-1">Firmware: {droid.firmware || "—"}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted">
        {isOffline
          ? <WifiOff size={12} className="text-error" />
          : <Wifi size={12} className={isInactive ? "text-muted" : "text-success"} />
        }
        Last ping: {droid.lastPing}
      </div>

      {droid.telemetryNotes && <p className="text-xs text-muted border-t border-border pt-2">{droid.telemetryNotes}</p>}
    </div>
  );
}
