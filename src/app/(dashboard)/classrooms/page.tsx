"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, X, Save, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getClassrooms, updateClassroom, deleteClassroom } from "@/lib/api/classrooms";
import { getSubjects } from "@/lib/api/subjects";
import { getTeachers } from "@/lib/api/teachers";
import { getSessions } from "@/lib/api/schedules";
import { getStudents } from "@/lib/api/students";
import { getDroids } from "@/lib/api/droids";
import { getSettings } from "@/lib/api/settings";
import { apiClient } from "@/lib/api-client";
import type { ClassGroup, Subject, Teacher, ClassSession, SessionDay, Droid } from "@/lib/types";

const DAYS: SessionDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DAY_LABELS: Record<SessionDay, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri" };
// Hourly slots from 07:00 to 18:00 (last block ends at 19:00).
const HOURS = Array.from({ length: 12 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);

interface SlotValue { sessionId?: string; subject: string; teacherId: string; teacherName: string }
type ScheduleMap = Record<string, SlotValue>;

function slotKey(day: SessionDay, hour: string) { return `${day}_${hour}`; }
function endTime(hour: string) {
  const h = parseInt(hour.split(":")[0]) + 1;
  return `${String(h).padStart(2, "0")}:00`;
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<ClassGroup[]>([]);
  const [activeRoom, setActiveRoom] = useState<ClassGroup | null>(null);
  const [recessTime, setRecessTime] = useState("");
  const [droids, setDroids] = useState<Droid[]>([]);

  // Edit modal
  const [editRoom, setEditRoom] = useState<ClassGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDroidId, setEditDroidId] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ClassGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [impact, setImpact] = useState<{ sessions: number; students: number } | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  // Edit error
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    getClassrooms().then(setClassrooms);
    getSettings().then((s) => setRecessTime(s.recessTime));
    getDroids().then(setDroids);
  }, []);

  function openEdit(room: ClassGroup) {
    setEditRoom(room);
    setEditName(room.name);
    setEditYear(String(room.academicYear));
    setEditLocation(room.room);
    setEditDroidId(room.droidId ?? "");
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editRoom) return;
    const patch = {
      name: editName.trim(),
      academicYear: Number(editYear) || editRoom.academicYear,
      room: editLocation.trim(),
      droidId: editDroidId || undefined,
    };
    setSaving(true);
    setEditError(null);
    try {
      await updateClassroom(editRoom.id, patch);
      setClassrooms((prev) => prev.map((c) => (c.id === editRoom.id ? { ...c, ...patch } : c)));
      setEditRoom(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  // Lazily fetch how many sessions/students this delete will affect.
  function openDelete(room: ClassGroup) {
    setDeleteTarget(room);
    setImpact(null);
    setDeleteError(null);
    setImpactLoading(true);
    Promise.all([getSessions(), getStudents()])
      .then(([sess, studs]) => {
        setImpact({
          sessions: sess.filter((s) => s.classGroup === room.name).length,
          students: studs.filter((s) => s.classGroup === room.name).length,
        });
      })
      .finally(() => setImpactLoading(false));
  }

  function closeDelete() {
    setDeleteTarget(null);
    setImpact(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteClassroom(deleteTarget.id);
      setClassrooms((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      closeDelete();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete class group.";
      // The backend cascade endpoint may not be implemented yet (404).
      setDeleteError(
        /not found|404/i.test(msg)
          ? "The backend hasn't implemented DELETE /class-groups/:id yet, so this class can't be deleted from the server."
          : msg,
      );
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = "rounded-lg border border-border px-3 py-2.5 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-text">Classrooms</h2>
          <p className="text-sm text-muted mt-1">Manage classroom assignments and Droid mappings. Click a classroom to manage its weekly schedule.</p>
        </div>
        <Link href="/register/class-group" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors">
          <Plus size={15} />
          New Class Group
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms.map((room) => (
          <div
            key={room.id}
            onClick={() => setActiveRoom(room)}
            className="group bg-surface rounded-xl border border-border p-5 hover:shadow-sm hover:border-primary/40 transition-all text-left cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted bg-subtle border border-border px-2 py-0.5 rounded-full">{room.academicYear}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(room); }}
                  title="Edit class group"
                  className="text-muted hover:text-text p-1.5 rounded transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDelete(room); }}
                  title="Delete class group"
                  className="text-muted hover:text-error p-1.5 rounded transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-text mb-0.5">{room.name}</h3>
            <p className="text-sm text-muted mb-3">{room.room}</p>
            {room.droidId && <span className="inline-flex items-center text-xs text-primary bg-primary-light px-2.5 py-1 rounded-full">🤖 {room.droidId}</span>}
          </div>
        ))}
      </div>

      {activeRoom && (
        <ScheduleModal room={activeRoom} recessTime={recessTime} onClose={() => setActiveRoom(null)} />
      )}

      {/* Edit class group modal */}
      <Modal open={!!editRoom} onClose={() => setEditRoom(null)} title="Edit Class Group" subtitle={editRoom?.name}>
        {editRoom && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Class Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} placeholder="e.g. 4 Bestari" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Academic Year</label>
              <input type="number" value={editYear} onChange={(e) => setEditYear(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Allocated Room / Space</label>
              <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className={inputCls} placeholder="e.g. Block A - Room 101" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Assigned Droid</label>
              <select value={editDroidId} onChange={(e) => setEditDroidId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {droids.map((d) => (
                  <option key={d.id} value={d.droidId}>{d.droidId} ({d.serialNumber})</option>
                ))}
                {/* Keep the current droid selectable even if it's not in the fleet list. */}
                {editDroidId && !droids.some((d) => d.droidId === editDroidId) && (
                  <option value={editDroidId}>{editDroidId}</option>
                )}
              </select>
            </div>

            {editError && (
              <p className="text-xs text-error rounded-lg border border-error-border bg-error-bg px-3 py-2">{editError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setEditRoom(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={saving} disabled={!editName.trim()}><Save size={14} />Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={closeDelete} title="Delete Class Group" subtitle={deleteTarget?.name}>
        {deleteTarget && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-text">
              Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>? This will also <strong>delete all scheduled sessions</strong> for this class, <strong>unassign its students</strong> (their class group is cleared to <em>Unassigned</em>), and <strong>release its assigned Droid</strong>. This cannot be undone.
            </p>
            <p className="text-xs text-muted">
              {impactLoading
                ? "Calculating impact…"
                : impact
                  ? `This will delete ${impact.sessions} session${impact.sessions === 1 ? "" : "s"} and unassign ${impact.students} student${impact.students === 1 ? "" : "s"}.`
                  : ""}
            </p>
            {deleteError && (
              <p className="text-xs text-error rounded-lg border border-error-border bg-error-bg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={closeDelete}>Cancel</Button>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                <Trash2 size={14} />
                {deleting ? "Deleting…" : "Delete Class Group"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ScheduleModal({ room, recessTime, onClose }: { room: ClassGroup; recessTime: string; onClose: () => void }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    async function load() {
      const [subs, tchs, sessions] = await Promise.all([
        getSubjects(),
        getTeachers(),
        getSessions(),
      ]);
      setSubjects(subs);
      setTeachers(tchs);

      const map: ScheduleMap = {};
      for (const s of sessions) {
        if (s.classGroup !== room.name) continue;
        const key = slotKey(s.day, s.startTime);
        map[key] = { sessionId: s.id, subject: s.subject, teacherId: s.teacherId, teacherName: s.teacherName };
      }
      setSchedule(map);
      setLoading(false);
    }
    load();
  }, [room.name]);

  function updateSlot(day: SessionDay, hour: string, field: "subject" | "teacherId", value: string) {
    const key = slotKey(day, hour);
    setSchedule((prev) => {
      const existing = prev[key] ?? { subject: "", teacherId: "", teacherName: "" };
      if (field === "subject") {
        return { ...prev, [key]: { ...existing, subject: value, teacherId: "", teacherName: "" } };
      }
      const teacher = teachers.find((t) => t.id === value);
      return { ...prev, [key]: { ...existing, teacherId: value, teacherName: teacher?.name ?? "" } };
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      const calls: Promise<unknown>[] = [];
      for (const day of DAYS) {
        for (const hour of HOURS) {
          if (hour === recessTime) continue;

          const key = slotKey(day, hour);
          const slot = schedule[key];
          if (!slot?.subject || !slot?.teacherId) continue;

          const payload = {
            subject: slot.subject,
            teacherId: slot.teacherId,
            teacherName: slot.teacherName,
            classGroup: room.name,
            startTime: hour,
            endTime: endTime(hour),
            day,
          };

          if (slot.sessionId) {
            calls.push(apiClient.patch(`/schedules/${slot.sessionId}`, payload));
          } else {
            calls.push(
              apiClient.post<ClassSession>("/schedules", payload).then((created) => {
                setSchedule((prev) => ({
                  ...prev,
                  [key]: { ...prev[key], sessionId: (created as ClassSession).id },
                }));
              })
            );
          }
        }
      }
      await Promise.all(calls);
      setSaveMsg("Schedule saved successfully.");
    } catch {
      setSaveMsg("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-text">Weekly Schedule — {room.name}</h2>
            <p className="text-xs text-muted mt-0.5">
              {room.room} · 07:00 – 19:00
              {recessTime && <span className="ml-2 text-amber-600">· ☕ Recess at {recessTime}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1.5 rounded transition-colors"><X size={18} /></button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-sm text-muted">Loading schedule…</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-20 text-left text-xs font-medium text-muted pb-2 pr-3">TIME</th>
                  {DAYS.map((d) => (
                    <th key={d} className="text-center text-xs font-semibold text-text pb-2 px-1 min-w-[160px]">
                      {DAY_LABELS[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {HOURS.map((hour) => {
                  if (hour === recessTime) {
                    return (
                      <tr key={hour} className="bg-amber-50/60">
                        <td className="pr-3 py-2 text-amber-600 font-mono whitespace-nowrap align-middle text-xs">
                          {hour}<br /><span className="text-[10px]">–{endTime(hour)}</span>
                        </td>
                        <td colSpan={5} className="px-2 py-2">
                          <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-semibold text-xs py-3">
                            ☕ RECESS / BREAK TIME
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={hour} className="group">
                      <td className="pr-3 py-2 text-muted font-mono whitespace-nowrap align-top pt-3">
                        {hour}<br /><span className="text-[10px]">–{endTime(hour)}</span>
                      </td>
                      {DAYS.map((day) => {
                        const key = slotKey(day, hour);
                        const slot = schedule[key] ?? { subject: "", teacherId: "", teacherName: "" };
                        const qualifiedTeachers = slot.subject
                          ? teachers.filter((t) =>
                              (t.subjects ?? []).includes(slot.subject) || t.id === slot.teacherId
                            )
                          : [];
                        return (
                          <td key={day} className="px-1 py-2">
                            <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-border bg-subtle hover:border-primary/40 transition-colors min-h-[64px]">
                              <select
                                value={slot.subject}
                                onChange={(e) => updateSlot(day, hour, "subject", e.target.value)}
                                className="w-full rounded border border-border px-2 py-1 text-xs bg-surface outline-none focus:border-primary"
                              >
                                <option value="">— Subject —</option>
                                {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                              <select
                                value={slot.teacherId}
                                onChange={(e) => updateSlot(day, hour, "teacherId", e.target.value)}
                                disabled={!slot.subject}
                                className="w-full rounded border border-border px-2 py-1 text-xs bg-surface outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">
                                  {!slot.subject ? "— Pick subject first —" : qualifiedTeachers.length === 0 ? "— No teachers assigned —" : "— Teacher —"}
                                </option>
                                {qualifiedTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          {saveMsg ? <p className={`text-xs ${saveMsg.includes("success") ? "text-success" : "text-error"}`}>{saveMsg}</p> : <span />}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={handleSave} loading={saving}><Save size={14} />Save Schedule</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
