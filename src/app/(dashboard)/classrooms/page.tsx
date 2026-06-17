"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getClassrooms } from "@/lib/api/classrooms";
import { getSubjects } from "@/lib/api/subjects";
import { getTeachers } from "@/lib/api/teachers";
import { getSessions } from "@/lib/api/schedules";
import { getSettings, updateSettings } from "@/lib/api/settings";
import { apiClient } from "@/lib/api-client";
import type { ClassGroup, Subject, Teacher, ClassSession, SessionDay } from "@/lib/types";

const DAYS: SessionDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DAY_LABELS: Record<SessionDay, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri" };
const HOURS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];

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
  const [savingRecess, setSavingRecess] = useState(false);

  useEffect(() => {
    getClassrooms().then(setClassrooms);
    getSettings().then((s) => setRecessTime(s.recessTime));
  }, []);

  async function handleRecessChange(value: string) {
    setRecessTime(value);
    setSavingRecess(true);
    await updateSettings({ recessTime: value });
    setSavingRecess(false);
  }

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

      {/* Global recess time — applies to all classrooms */}
      <div className="flex items-center gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
        <span className="text-sm font-semibold text-amber-700 whitespace-nowrap">☕ School Recess Time:</span>
        <select
          value={recessTime}
          onChange={(e) => handleRecessChange(e.target.value)}
          className="text-sm border border-amber-200 rounded-lg px-3 py-1.5 bg-white text-amber-800 outline-none focus:border-amber-400"
        >
          <option value="">None</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h} – {endTime(h)}</option>
          ))}
        </select>
        <span className="text-xs text-amber-600">
          {savingRecess ? "Saving…" : recessTime ? `Recess is set to ${recessTime}–${endTime(recessTime)} for all classrooms.` : "No recess time set."}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms.map((room) => (
          <button key={room.id} onClick={() => setActiveRoom(room)} className="bg-surface rounded-xl border border-border p-5 hover:shadow-sm hover:border-primary/40 transition-all text-left">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <span className="text-xs text-muted bg-subtle border border-border px-2 py-0.5 rounded-full">{room.academicYear}</span>
            </div>
            <h3 className="font-semibold text-text mb-0.5">{room.name}</h3>
            <p className="text-sm text-muted mb-3">{room.room}</p>
            {room.droidId && <span className="inline-flex items-center text-xs text-primary bg-primary-light px-2.5 py-1 rounded-full">🤖 {room.droidId}</span>}
          </button>
        ))}
      </div>

      {activeRoom && (
        <ScheduleModal room={activeRoom} recessTime={recessTime} onClose={() => setActiveRoom(null)} />
      )}
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
              {room.room} · 07:00 – 14:00
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
