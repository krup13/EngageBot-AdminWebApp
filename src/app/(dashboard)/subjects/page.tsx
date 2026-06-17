"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { getSubjects, createSubject, deleteSubject } from "@/lib/api/subjects";
import type { Subject } from "@/lib/types";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getSubjects().then(setSubjects).finally(() => setLoading(false));
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
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                <BookOpen size={17} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">{s.name}</p>
                {s.description && <p className="text-xs text-muted mt-0.5">{s.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="text-muted hover:text-error transition-colors p-1.5 rounded disabled:opacity-40"
                title="Delete subject"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
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
