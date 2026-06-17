"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, BookOpen, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { getSubjects, createSubject, deleteSubject } from "@/lib/api/subjects";
import { getTeachers } from "@/lib/api/teachers";
import type { Subject, Teacher } from "@/lib/types";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    getSubjects().then(setSubjects).finally(() => setLoading(false));
    getTeachers().then(setTeachers);
  }, []);

  async function handleAdd() {
    if (!newName.trim()) { setNameError("Subject name is required."); return; }
    setSaving(true);
    try {
      const s = await createSubject({ name: newName.trim(), description: newDesc.trim() });
      setSubjects((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
      setAddOpen(false);
      setNewName("");
      setNewDesc("");
      setNameError("");
    } catch (e: unknown) {
      setNameError(e instanceof Error ? e.message : "Failed to add subject.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteSubject(id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Subjects</h2>
          <p className="text-sm text-muted mt-1">Manage the subjects taught in your school. These appear as options when assigning teachers and building schedules.</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} />
          Add Subject
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : subjects.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-10 text-center">
          <BookOpen size={32} className="text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-text mb-1">No subjects yet</p>
          <p className="text-xs text-muted mb-4">Add subjects like Mathematics, Science, English Language, etc.</p>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={13} />Add First Subject</Button>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border divide-y divide-border">
          {subjects.map((s) => {
            const teaching = teachers.filter((t) => (t.subjects ?? []).includes(s.name));
            const isOpen = expanded.has(s.id);
            return (
            <div key={s.id} className="px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                  <BookOpen size={17} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text">{s.name}</p>
                  {s.description && <p className="text-xs text-muted mt-0.5">{s.description}</p>}
                </div>

                {/* Teachers dropdown toggle */}
                <button
                  onClick={() => toggleExpanded(s.id)}
                  aria-expanded={isOpen}
                  className="flex items-center gap-1.5 text-xs font-medium text-text border border-border rounded-lg px-3 py-1.5 hover:bg-subtle transition-colors shrink-0"
                >
                  <Users size={13} className="text-muted" />
                  {teaching.length} teacher{teaching.length === 1 ? "" : "s"}
                  <ChevronDown size={14} className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="text-muted hover:text-error transition-colors p-1.5 rounded disabled:opacity-40"
                  title="Delete subject"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Expanded teacher list */}
              {isOpen && (
                <div className="mt-3 ml-[52px]">
                  {teaching.length > 0 ? (
                    <ul className="flex flex-col gap-1.5 rounded-lg border border-border bg-subtle p-3">
                      {teaching.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-sm text-text">
                          <span className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {t.name.charAt(0)}
                          </span>
                          <span className="truncate">{t.name}</span>
                          {t.department && <span className="text-xs text-muted truncate">· {t.department}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted italic rounded-lg border border-border bg-subtle p-3">
                      No teachers assigned to this subject yet.
                    </p>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setNewName(""); setNewDesc(""); setNameError(""); }}
        title="Add Subject"
        subtitle="This subject will be available when assigning teachers and building class schedules."
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Subject Name"
            placeholder="e.g. Mathematics"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
            error={nameError}
          />
          <Input
            label="Description (optional)"
            placeholder="e.g. Core mathematics curriculum for Form 4–5"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={saving}><Plus size={14} />Add Subject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
