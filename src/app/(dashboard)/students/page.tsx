"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, MoreVertical, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { getStudents, updateStudent } from "@/lib/api/students";
import { getClassrooms } from "@/lib/api/classrooms";
import { Student } from "@/lib/types";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editIC, setEditIC] = useState("");
  const [editClass, setEditClass] = useState("");
  const [icError, setIcError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStudents().then(setStudents);
    getClassrooms()
      .then((groups) => setClassOptions(groups.map((g) => g.name)))
      .catch(() => setClassOptions([]))
      .finally(() => setClassesLoading(false));
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.icNumber.includes(search)
  );

  function openEdit(student: Student) {
    setEditStudent(student);
    setEditName(student.name);
    setEditIC(student.icNumber);
    setEditClass(student.classGroup);
    setIcError("");
  }

  async function handleSave() {
    if (!editStudent) return;
    const clean = editIC.replace(/\D/g, "");
    if (clean.length !== 12) {
      setIcError("IC number must contain 12 digits excluding hyphens.");
      return;
    }
    const patch = { name: editName, icNumber: editIC, classGroup: editClass };
    setSaving(true);
    await updateStudent(editStudent.id, patch);
    setStudents((prev) =>
      prev.map((s) => (s.id === editStudent.id ? { ...s, ...patch } : s))
    );
    setSaving(false);
    setEditStudent(null);
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Students</h2>
          <p className="text-sm text-muted mt-1">Review and manage registered student records.</p>
        </div>
        <Link href="/register/students">
          <Button size="sm">
            <GraduationCap size={14} />
            Register Student(s)
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by full name or IC…"
            className="w-full rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
          />
        </div>
        <span className="text-sm text-muted ml-auto">
          Showing <strong>{filtered.length}</strong> of <strong>{students.length}</strong> total students
        </span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted mb-4">
        <span>Registrations</span>
        <span>›</span>
        <span className="text-text font-medium">Review Batch</span>
        <span className="ml-2 text-xs text-muted italic">Ordered alphabetically for submission</span>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-subtle">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" className="rounded border-border accent-primary" />
              </th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">
                <button className="flex items-center gap-1 hover:text-text">
                  FULL NAME <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">IC / MYKAD</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">CLASS GROUP</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">SOURCE</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">STATUS</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr
                key={s.id}
                className={`hover:bg-subtle transition-colors ${s.status === "error" ? "border-l-2 border-l-error" : ""}`}
              >
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded border-border accent-primary" />
                </td>
                <td className="px-4 py-3 font-medium text-text">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{s.icNumber}</td>
                <td className="px-4 py-3 text-sm text-text">{s.classGroup}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.source === "csv" ? "bg-blue-50 text-blue-700" : "bg-subtle text-muted"}`}>
                    {s.source.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-muted hover:text-text p-1 rounded transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-border text-xs text-muted">
          Showing {filtered.length} of {students.length} total students in this batch session.
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        title="Edit Student Details"
        subtitle={editStudent ? `ID: ${editStudent.studentId}` : undefined}
      >
        {editStudent && (
          <div className="flex flex-col gap-5">
            {icError && <AlertBanner message={icError} variant="error" />}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Full Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">MyKad / IC Number</label>
                <input
                  value={editIC}
                  onChange={(e) => { setEditIC(e.target.value); setIcError(""); }}
                  className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-1 ${icError ? "border-error focus:ring-error" : "border-border focus:border-primary focus:ring-primary"}`}
                />
                {icError && <p className="text-xs text-error">{icError}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text">Class Group</label>
                <select
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  disabled={classesLoading || classOptions.length === 0}
                  className="rounded-lg border border-border px-3 py-2.5 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {classesLoading ? (
                    <option value={editClass}>{editClass || "Loading…"}</option>
                  ) : classOptions.length === 0 ? (
                    <option value={editClass}>{editClass || "No class groups registered"}</option>
                  ) : (
                    <>
                      <option value="">Select class…</option>
                      {classOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {editStudent.source === "csv" && (
              <div className="bg-subtle rounded-lg border border-border p-3 flex items-start gap-2">
                <span className="text-muted shrink-0 mt-0.5 text-xs font-semibold">IMPORT SOURCE</span>
                <span className="text-xs text-text">Batch_Oct_24_Primary.csv (Row 142)</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setEditStudent(null)}>Cancel Changes</Button>
              <Button onClick={handleSave} loading={saving}>Save Record</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
