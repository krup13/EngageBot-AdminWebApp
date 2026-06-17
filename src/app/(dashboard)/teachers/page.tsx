"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, MoreVertical, Download, UserPlus, CalendarClock, Pencil, Trash2, X, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getTeachers, updateTeacher, deleteTeacher } from "@/lib/api/teachers";
import { getSubjects } from "@/lib/api/subjects";
import { getSessions, updateSession, DAYS } from "@/lib/api/schedules";
import { createNotification } from "@/lib/api/notifications";
import { subjectsForTeacher, freeTeachers, sessionsForTeacherToday, planTeacherReassignment, type ReassignmentPlan } from "@/lib/schedule-utils";
import type { Teacher, ClassSession, SessionDay, Subject } from "@/lib/types";
// NOTE: assignedClasses is now managed automatically by the schedule — not editable here

const STATUS_OPTIONS: Teacher["status"][] = ["active", "pending", "inactive"];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [freeDay, setFreeDay] = useState<SessionDay | "">("");
  const [freeStart, setFreeStart] = useState("");
  const [freeEnd, setFreeEnd] = useState("");

  // Edit modal
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<Teacher["status"]>("active");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deletePlan, setDeletePlan] = useState<ReassignmentPlan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Today's-classes modal
  const [todayTeacher, setTodayTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    getTeachers().then(setTeachers);
    getSessions().then(setSessions);
    getSubjects().then(setSubjects);
  }, []);

  const allSubjects = useMemo(
    () => [...new Set(sessions.map((s) => s.subject))].sort(),
    [sessions]
  );

  const freeIds = useMemo(() => {
    if (!freeDay || !freeStart || !freeEnd) return null;
    return new Set(freeTeachers(teachers, sessions, freeDay, freeStart, freeEnd).map((t) => t.id));
  }, [freeDay, freeStart, freeEnd, teachers, sessions]);

  const filtered = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesSubject =
      subjectFilter === "all" || subjectsForTeacher(sessions, t.id).includes(subjectFilter) ||
      (t.subjects ?? []).includes(subjectFilter);
    const matchesFree = freeIds === null || freeIds.has(t.id);
    return matchesSearch && matchesSubject && matchesFree;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }
  function toggleAll() {
    setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id));
  }

  function openEdit(t: Teacher) {
    setEditTeacher(t);
    setEditName(t.name);
    setEditEmail(t.email);
    setEditSubjects(t.subjects ?? []);
    setEditStatus(t.status);
  }

  function toggleSubject(name: string) {
    setEditSubjects((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  }

  async function handleSave() {
    if (!editTeacher) return;
    const patch = {
      name: editName,
      email: editEmail,
      subjects: editSubjects,
      status: editStatus,
    };
    setSaving(true);
    await updateTeacher(editTeacher.id, patch);
    setTeachers((prev) =>
      prev.map((t) => (t.id === editTeacher.id ? { ...t, ...patch } : t))
    );
    setSaving(false);
    setEditTeacher(null);
  }

  function openDelete(t: Teacher) {
    setDeleteTarget(t);
    setDeletePlan(planTeacherReassignment(t, teachers, sessions));
    setDeleteError(null);
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeletePlan(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deleteTarget || !deletePlan) return;
    if (deletePlan.unresolved.length > 0) return; // blocked — button isn't shown anyway
    setDeleting(true);
    setDeleteError(null);
    try {
      // Reassign each covered session to its successor and notify them (relief).
      for (const { session, successor } of deletePlan.reassignments) {
        await updateSession(session.id, { teacherId: successor.id, teacherName: successor.name });
        await createNotification({
          teacherId: successor.id,
          type: "relief",
          message: `You've been assigned a relief class: ${session.subject} for ${session.classGroup} on ${session.day} ${session.startTime}–${session.endTime} (covering for ${deleteTarget.name}).`,
          sessionId: session.id,
        });
      }
      await deleteTeacher(deleteTarget.id);
      const successorBySession = new Map(deletePlan.reassignments.map((r) => [r.session.id, r.successor]));
      setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setSessions((prev) =>
        prev.map((s) => {
          const succ = successorBySession.get(s.id);
          return succ ? { ...s, teacherId: succ.id, teacherName: succ.name } : s;
        }),
      );
      closeDelete();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete teacher.";
      setDeleteError(
        /not found|404/i.test(msg)
          ? "The backend hasn't implemented DELETE /teachers/:id yet, so this teacher can't be deleted from the server."
          : msg,
      );
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = "rounded-lg border border-border px-3 py-2.5 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";
  const filterCls = "h-9 px-3 text-sm border border-border rounded-lg bg-surface text-text outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Teachers</h2>
          <p className="text-sm text-muted mt-1">Manage staff profiles, subject assignments, and class assignments.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm"><Download size={14} />Export Directory</Button>
          <Link href="/register/teacher"><Button size="sm"><UserPlus size={14} />Register New Teacher</Button></Link>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID or email…" className="w-full rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface" />
        </div>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={filterCls}>
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          {allSubjects.filter((s) => !subjects.find((sub) => sub.name === s)).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-muted ml-auto">Showing <strong>{filtered.length}</strong> of <strong>{teachers.length}</strong> teachers</span>
      </div>

      {/* Free-at filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5 text-sm">
        <span className="text-muted">Free at:</span>
        <select value={freeDay} onChange={(e) => setFreeDay(e.target.value as SessionDay | "")} className={filterCls}>
          <option value="">Any day</option>
          {DAYS.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
        </select>
        <input type="time" value={freeStart} onChange={(e) => setFreeStart(e.target.value)} className={filterCls} />
        <span className="text-muted">–</span>
        <input type="time" value={freeEnd} onChange={(e) => setFreeEnd(e.target.value)} className={filterCls} />
        {(freeDay || freeStart || freeEnd) && (
          <button onClick={() => { setFreeDay(""); setFreeStart(""); setFreeEnd(""); }} className="text-xs text-muted hover:text-text underline">Clear</button>
        )}
        {freeIds !== null && <span className="text-xs text-primary">{freeIds.size} teacher(s) free</span>}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-subtle">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded border-border accent-primary" />
              </th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">NAME &amp; ID</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">SUBJECTS</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">ASSIGNED CLASSES</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">DATE ADDED</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-subtle transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} className="rounded border-border accent-primary" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                        {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${t.status === "active" ? "bg-success" : t.status === "pending" ? "bg-warning" : "bg-muted"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-text">{t.name}</p>
                      <p className="text-xs text-muted">{t.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(t.subjects ?? []).length > 0
                      ? (t.subjects ?? []).map((s) => (
                          <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-subtle text-muted border border-border">{s}</span>
                        ))
                      : t.department
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-subtle text-muted border border-border">{t.department}</span>
                        : <span className="text-xs text-muted italic">—</span>
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(t.assignedClasses ?? []).map((c) => (
                      <span key={c} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary border border-success/30">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted">
                  {new Date(t.dateAdded).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setTodayTeacher(t)} title="Today's classes" className="text-muted hover:text-primary p-1.5 rounded transition-colors"><CalendarClock size={16} /></button>
                    <button onClick={() => openEdit(t)} title="Edit teacher" className="text-muted hover:text-text p-1.5 rounded transition-colors"><MoreVertical size={16} /></button>
                    <button onClick={() => openDelete(t)} title="Delete teacher" className="text-muted hover:text-error p-1.5 rounded transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">No teachers match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Teacher modal */}
      <Modal open={!!editTeacher} onClose={() => setEditTeacher(null)} title="Edit Teacher Details" subtitle={editTeacher ? `ID: ${editTeacher.employeeId}` : undefined}>
        {editTeacher && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Full Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Work Email</label>
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} />
            </div>

            {/* Subjects multi-select */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text">Subjects</label>
              {subjects.length === 0 ? (
                <p className="text-xs text-muted">No subjects registered yet. <Link href="/subjects" className="text-primary underline">Add subjects first.</Link></p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => {
                    const active = editSubjects.includes(s.name);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleSubject(s.name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "bg-primary text-white border-primary" : "bg-surface text-muted border-border hover:border-primary"}`}>
                        {active && <X size={11} />}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as Teacher["status"])} className={inputCls}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setEditTeacher(null)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}><Pencil size={14} />Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={closeDelete} title="Delete Teacher" subtitle={deleteTarget?.name}>
        {deleteTarget && deletePlan && (
          deletePlan.unresolved.length > 0 ? (
            // Branch C — blocked: at least one class has no qualified, free successor.
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-2.5 rounded-lg border border-error-border bg-error-bg px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-error">Can&#39;t delete {deleteTarget.name} yet</p>
                  <p className="text-xs text-error mt-0.5">
                    The class{deletePlan.unresolved.length === 1 ? "" : "es"} below {deletePlan.unresolved.length === 1 ? "has" : "have"} no qualified, available replacement teacher. Reassign or reschedule {deletePlan.unresolved.length === 1 ? "it" : "them"} on the Schedules page first, then try again.
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 max-h-56 overflow-auto">
                {deletePlan.unresolved.map((s) => (
                  <li key={s.id} className="text-sm text-text rounded-lg border border-border px-3 py-2">
                    <span className="font-medium">{s.subject}</span> · {s.classGroup} · {s.day[0].toUpperCase() + s.day.slice(1)} {s.startTime}–{s.endTime}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="ghost" onClick={closeDelete}>Close</Button>
                <Link href="/schedules"><Button>Go to Schedules</Button></Link>
              </div>
            </div>
          ) : deletePlan.reassignments.length === 0 ? (
            // Branch A — no sessions: straightforward delete.
            <div className="flex flex-col gap-5">
              <p className="text-sm text-text">
                <strong>{deleteTarget.name}</strong> has no scheduled classes. Deleting will permanently remove their account. This cannot be undone.
              </p>
              {deleteError && (
                <p className="text-xs text-error rounded-lg border border-error-border bg-error-bg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="ghost" onClick={closeDelete}>Cancel</Button>
                <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                  <Trash2 size={14} />
                  {deleting ? "Deleting…" : "Delete Teacher"}
                </button>
              </div>
            </div>
          ) : (
            // Branch B — fully reassignable: show the reassignment plan.
            <div className="flex flex-col gap-5">
              <p className="text-sm text-text">
                Deleting <strong>{deleteTarget.name}</strong> will reassign their {deletePlan.reassignments.length} class{deletePlan.reassignments.length === 1 ? "" : "es"} to the teachers below (each is notified), then permanently remove the account. This cannot be undone.
              </p>
              <ul className="flex flex-col gap-1.5 max-h-56 overflow-auto">
                {deletePlan.reassignments.map(({ session: s, successor }) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm text-text rounded-lg border border-border px-3 py-2">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{s.subject}</span> · {s.classGroup} · {s.day[0].toUpperCase() + s.day.slice(1)} {s.startTime}–{s.endTime}
                    </span>
                    <ArrowRight size={14} className="text-muted shrink-0" />
                    <span className="font-medium text-primary shrink-0">{successor.name}</span>
                  </li>
                ))}
              </ul>
              {deleteError && (
                <p className="text-xs text-error rounded-lg border border-error-border bg-error-bg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="ghost" onClick={closeDelete}>Cancel</Button>
                <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50">
                  <Trash2 size={14} />
                  {deleting ? "Reassigning…" : "Reassign & Delete"}
                </button>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* Today's classes modal */}
      <Modal open={!!todayTeacher} onClose={() => setTodayTeacher(null)} title={todayTeacher ? `${todayTeacher.name} — Today's Classes` : ""} subtitle="Scheduled sessions for the current weekday">
        {todayTeacher && <TodayClasses teacher={todayTeacher} sessions={sessions} />}
      </Modal>
    </div>
  );
}

function TodayClasses({ teacher, sessions }: { teacher: Teacher; sessions: ClassSession[] }) {
  const today = (["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()]) as string;
  const day = (DAYS.includes(today as SessionDay) ? today : "monday") as SessionDay;
  const todays = sessionsForTeacherToday(sessions, teacher.id, day);
  if (todays.length === 0) return <p className="text-sm text-muted">No classes scheduled for {day[0].toUpperCase() + day.slice(1)}.</p>;
  return (
    <div className="flex flex-col gap-2">
      {todays.map((s) => (
        <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
          <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: s.color ?? "#E5E7EB" }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">{s.subject}</p>
            <p className="text-xs text-muted">{s.classGroup}</p>
          </div>
          <span className="text-sm font-mono text-muted">{s.startTime}–{s.endTime}</span>
        </div>
      ))}
    </div>
  );
}
