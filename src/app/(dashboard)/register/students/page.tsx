"use client";

import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { Trash2, Plus, CheckCircle2, AlertCircle, Upload, Download, FileText } from "lucide-react";
import { TabToggle } from "@/components/ui/TabToggle";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { registerStudent } from "@/lib/api/students";
import { getClassrooms } from "@/lib/api/classrooms";
import Link from "next/link";

interface ManualRow {
  id: string;
  name: string;
  ic: string;
  classGroup: string;
  icValid: boolean;
}

interface ParsedRow {
  name: string;
  ic: string;
  classGroup: string;
  valid: boolean;
  error?: string;
}

function validateIC(ic: string) {
  return ic.replace(/\D/g, "").length === 12;
}

function triggerDownload(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RegisterStudentsPage() {
  const [activeTab, setActiveTab] = useState("manual");
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    getClassrooms()
      .then((groups) => setClassOptions(groups.map((g) => g.name)))
      .catch(() => setClassOptions([]))
      .finally(() => setClassesLoading(false));
  }, []);

  // Manual tab
  const [rows, setRows] = useState<ManualRow[]>([
    { id: "1", name: "", ic: "", classGroup: "", icValid: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [manualDone, setManualDone] = useState<number | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  // CSV tab
  const [csvRows, setCsvRows] = useState<ParsedRow[] | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvDone, setCsvDone] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ROWS = 50;

  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, { id: String(Date.now()), name: "", ic: "", classGroup: "", icValid: false }]);
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }
  function updateRow(id: string, field: keyof ManualRow, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "ic") updated.icValid = validateIC(value);
        return updated;
      })
    );
  }
  function clearAll() {
    setRows([{ id: "1", name: "", ic: "", classGroup: "", icValid: false }]);
    setManualDone(null);
    setManualError(null);
  }

  async function handleManualSubmit() {
    setManualError(null);
    const valid = rows.filter((r) => r.name.trim() && r.icValid && r.classGroup);
    if (valid.length === 0) {
      setManualError("Add at least one row with a name, a 12-digit IC, and a class group.");
      return;
    }
    setSubmitting(true);
    for (const r of valid) {
      await registerStudent({ name: r.name.trim(), icNumber: r.ic.trim(), classGroup: r.classGroup });
    }
    setSubmitting(false);
    setManualDone(valid.length);
    setRows([{ id: "1", name: "", ic: "", classGroup: "", icValid: false }]);
  }

  function downloadTemplate() {
    const ex1 = classOptions[0] ?? "4 Gemilang";
    const ex2 = classOptions[1] ?? ex1;
    const csv = Papa.unparse({
      fields: ["Full Name", "IC Number", "Class Group"],
      data: [
        ["Ahmad Danish Bin Razak", "080512101233", ex1],
        ["Siti Nurhaliza Binti Abu", "081120145562", ex2],
      ],
    });
    triggerDownload("engagebot_student_template.csv", csv);
  }

  function parseFile(file: File) {
    setCsvFileName(file.name);
    setCsvDone(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed: ParsedRow[] = res.data.map((row) => {
          const name = (row["Full Name"] ?? row["name"] ?? "").trim();
          const ic = (row["IC Number"] ?? row["ic"] ?? "").trim();
          const classGroup = (row["Class Group"] ?? row["classGroup"] ?? "").trim();
          let error: string | undefined;
          if (!name) error = "Missing name";
          else if (!validateIC(ic)) error = "Invalid IC";
          else if (!classGroup) error = "Missing class";
          return { name, ic, classGroup, valid: !error, error };
        });
        setCsvRows(parsed);
      },
    });
  }

  async function handleCsvSubmit() {
    if (!csvRows) return;
    const valid = csvRows.filter((r) => r.valid);
    setCsvSubmitting(true);
    for (const r of valid) {
      await registerStudent({ name: r.name, icNumber: r.ic, classGroup: r.classGroup });
    }
    setCsvSubmitting(false);
    setCsvDone(valid.length);
    setCsvRows(null);
    setCsvFileName("");
  }

  const validCount = csvRows?.filter((r) => r.valid).length ?? 0;
  const invalidCount = csvRows ? csvRows.length - validCount : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Register Student(s)</h2>
          <p className="text-sm text-muted mt-1">Supports up to 50 students per submission.</p>
        </div>
        <TabToggle
          tabs={[
            { label: "Enter Manually", value: "manual" },
            { label: "Enter via CSV", value: "csv" },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Manual Entry */}
      {activeTab === "manual" && (
        <div className="bg-surface rounded-2xl border border-border">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-text">Manual Entry</h3>
              <p className="text-xs text-muted mt-0.5">Fill in student details below.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{rows.length} / {MAX_ROWS} Students</span>
              <button onClick={clearAll} className="text-xs text-error hover:underline">Clear All</button>
            </div>
          </div>

          {manualDone !== null && (
            <div className="mx-5 mb-2 flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success-bg px-4 py-3">
              <p className="text-sm text-success">
                <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                Registered {manualDone} student{manualDone === 1 ? "" : "s"} to the database.
              </p>
              <Link href="/students" className="text-xs font-semibold text-success underline">View Students</Link>
            </div>
          )}
          {manualError && (
            <div className="mx-5 mb-2 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-sm text-error">
              {manualError}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="w-12 text-left text-xs font-medium text-muted px-5 py-2.5">NO.</th>
                <th className="text-left text-xs font-medium text-muted px-4 py-2.5">FULL NAME</th>
                <th className="text-left text-xs font-medium text-muted px-4 py-2.5">STUDENT IC NUMBER</th>
                <th className="text-left text-xs font-medium text-muted px-4 py-2.5">CLASS GROUP</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => (
                <tr key={row.id} className="group">
                  <td className="px-5 py-2.5 text-sm text-muted">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={row.name}
                      onChange={(e) => updateRow(row.id, "name", e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="12-digit IC number"
                        value={row.ic}
                        onChange={(e) => updateRow(row.id, "ic", e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 pr-8 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      {row.ic && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {row.icValid
                            ? <CheckCircle2 size={15} className="text-success" />
                            : <AlertCircle size={15} className="text-error" />}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={row.classGroup}
                      onChange={(e) => updateRow(row.id, "classGroup", e.target.value)}
                      disabled={classesLoading || classOptions.length === 0}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {classesLoading ? (
                        <option value="">Loading classes…</option>
                      ) : classOptions.length === 0 ? (
                        <option value="">No class groups registered yet</option>
                      ) : (
                        <>
                          <option value="">Select class…</option>
                          {classOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="text-muted hover:text-error disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={addRow} disabled={rows.length >= MAX_ROWS}>
              <Plus size={15} />
              Add Row
            </Button>
            <Button onClick={handleManualSubmit} loading={submitting}>
              Register Students →
            </Button>
          </div>
        </div>
      )}

      {/* CSV Upload */}
      {activeTab === "csv" && (
        <div className="flex flex-col gap-5">
          {csvDone !== null && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success-bg px-4 py-3">
              <p className="text-sm text-success">
                <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                Imported {csvDone} student{csvDone === 1 ? "" : "s"} to the database.
              </p>
              <Link href="/students" className="text-xs font-semibold text-success underline">View Students</Link>
            </div>
          )}

          {/* Template download */}
          <div className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text">Download Official Template</p>
                <p className="text-xs text-muted mt-0.5">
                  Columns: Full Name, IC Number, Class Group. Fill it in and upload below.
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>
              <Download size={14} />
              Download CSV Template
            </Button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]);
            }}
            className={`rounded-xl border-2 border-dashed p-12 flex flex-col items-center gap-4 text-center transition-colors
              ${dragOver ? "border-primary bg-primary-light" : "border-border bg-surface hover:border-primary/50"}`}
          >
            <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
              <Upload size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">
                {csvFileName || "Drop CSV file here or click to upload"}
              </p>
              <p className="text-xs text-muted mt-1">Your file is parsed in the browser. .csv format following the template.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }}
            />
            <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
          </div>

          {/* Parse results */}
          {csvRows && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface rounded-xl border border-border p-4 text-center">
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Parsed Rows</p>
                  <p className="text-2xl font-bold text-text">{csvRows.length}</p>
                </div>
                <div className="bg-surface rounded-xl border border-success-bg p-4 text-center">
                  <p className="text-xs font-medium text-success uppercase tracking-wide mb-1">Valid Rows</p>
                  <p className="text-2xl font-bold text-success">{validCount}</p>
                </div>
                <div className="bg-error-bg rounded-xl border border-error-border p-4 text-center">
                  <p className="text-xs font-medium text-error uppercase tracking-wide mb-1">Rows with Errors</p>
                  <p className="text-2xl font-bold text-error">{invalidCount}</p>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-surface rounded-xl border border-border">
                <div className="px-5 pt-4 pb-2">
                  <h4 className="text-sm font-semibold text-text">Parsing Preview (first 5 rows)</h4>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border">
                      <th className="text-left text-xs font-medium text-muted px-5 py-2.5">Full Name</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-2.5">IC Number</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-2.5">Class Group</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className={!row.valid ? "bg-error-bg/30" : ""}>
                        <td className="px-5 py-2.5">{row.name || <span className="text-muted italic">—</span>}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{row.ic}</td>
                        <td className="px-4 py-2.5">{row.classGroup}</td>
                        <td className="px-4 py-2.5">
                          {row.valid
                            ? <StatusBadge status="verified" />
                            : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-bg text-error border border-error-border">{row.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-subtle rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Ready to import?</p>
                  <p className="text-xs text-muted mt-0.5">
                    {validCount} valid record{validCount === 1 ? "" : "s"} will be registered. {invalidCount} skipped.
                  </p>
                </div>
                <Button onClick={handleCsvSubmit} loading={csvSubmitting} disabled={validCount === 0}>
                  Import {validCount} Student{validCount === 1 ? "" : "s"} →
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link href="/register" className="text-sm text-muted hover:text-text transition-colors">
          ← Back to Registration Hub
        </Link>
      </div>
    </div>
  );
}
