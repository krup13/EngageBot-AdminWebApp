"use client";

import { useState, useRef } from "react";
import { Trash2, Plus, CheckCircle2, AlertCircle, Upload, Download, FileText } from "lucide-react";
import { TabToggle } from "@/components/ui/TabToggle";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/Badge";
import { StudentCSVRow } from "@/lib/types";
import Link from "next/link";

const CLASS_OPTIONS = [
  { value: "4-gemilang", label: "4 Gemilang" },
  { value: "4-bestari", label: "4 Bestari" },
  { value: "5-amanah", label: "5 Amanah" },
  { value: "5-zamrud", label: "5 Zamrud" },
  { value: "3-cerdas", label: "3 Cerdas" },
  { value: "6-gigih", label: "6 Gigih" },
];

interface ManualRow {
  id: string;
  name: string;
  ic: string;
  classGroup: string;
  icValid: boolean;
}

const MOCK_CSV_ROWS: StudentCSVRow[] = [
  { name: "Ahmad Danish Bin Razak", icNumber: "080512-10-1233", classGroup: "4 Science 1", rowNumber: 1, status: "valid" },
  { name: "Siti Nurhaliza Binti Abu", icNumber: "081120-14-5562", classGroup: "4 Arts 2", rowNumber: 2, status: "valid" },
  { name: "Lim Wei Sheng", icNumber: "080205-01-9987", classGroup: "4 Science 1", rowNumber: 3, status: "invalid", errorReason: "Invalid Class" },
];

function validateIC(ic: string) {
  return ic.replace(/\D/g, "").length === 12;
}

export default function RegisterStudentsPage() {
  const [activeTab, setActiveTab] = useState("manual");

  // Manual tab state
  const [rows, setRows] = useState<ManualRow[]>([
    { id: "1", name: "", ic: "", classGroup: "", icValid: false },
  ]);

  // CSV tab state
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
  }

  function handleFileChange() {
    setCsvUploaded(true);
  }

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
        <div className="bg-white rounded-2xl border border-border">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-text">Manual Entry</h3>
              <p className="text-xs text-muted mt-0.5">Fill in student details below.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{rows.length} / {MAX_ROWS} Students</span>
              <button onClick={clearAll} className="text-xs text-error hover:underline">
                Clear All
              </button>
            </div>
          </div>

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
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="12-digit IC number"
                        value={row.ic}
                        onChange={(e) => updateRow(row.id, "ic", e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 pr-8 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      {row.ic && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {row.icValid
                            ? <CheckCircle2 size={15} className="text-success" />
                            : <AlertCircle size={15} className="text-error" />
                          }
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={row.classGroup}
                      onChange={(e) => updateRow(row.id, "classGroup", e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select class…</option>
                      {CLASS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
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
            <Button>
              Proceed to Review →
            </Button>
          </div>
        </div>
      )}

      {/* CSV Upload */}
      {activeTab === "csv" && (
        <div className="flex flex-col gap-5">
          {/* Template download */}
          <div className="bg-white rounded-xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text">Download Official Template</p>
                <p className="text-xs text-muted mt-0.5">
                  Ensure your data matches our system requirements for a smooth import process.
                </p>
                <p className="text-xs text-primary mt-1">
                  Constraints: Max 5.0 MB file size • Up to 500 rows per upload.
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              <Download size={14} />
              Download CSV Template
            </Button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); setCsvUploaded(true); }}
            className={`rounded-xl border-2 border-dashed p-12 flex flex-col items-center gap-4 text-center transition-colors
              ${dragOver ? "border-primary bg-primary-light" : "border-border bg-white hover:border-primary/50"}`}
          >
            <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
              <Upload size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Drop CSV file here or click to upload</p>
              <p className="text-xs text-muted mt-1">
                Your file will be parsed automatically. We support .csv and .xlsx formats following the official template structure.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
          </div>

          {/* Parse results */}
          {csvUploaded && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-border p-4 text-center">
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Parsed Rows</p>
                  <p className="text-2xl font-bold text-text">450</p>
                </div>
                <div className="bg-white rounded-xl border border-success-bg p-4 text-center">
                  <p className="text-xs font-medium text-success uppercase tracking-wide mb-1">Valid Rows</p>
                  <p className="text-2xl font-bold text-success">442</p>
                </div>
                <div className="bg-error-bg rounded-xl border border-error-border p-4 text-center">
                  <p className="text-xs font-medium text-error uppercase tracking-wide mb-1">Rows with Errors</p>
                  <p className="text-2xl font-bold text-error">8</p>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-xl border border-border">
                <div className="px-5 pt-4 pb-2">
                  <h4 className="text-sm font-semibold text-text">Parsing Preview (First 3 Rows)</h4>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border">
                      <th className="text-left text-xs font-medium text-muted px-5 py-2.5">Full Name</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-2.5">Student IC Number</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-2.5">Class Group</th>
                      <th className="text-left text-xs font-medium text-muted px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MOCK_CSV_ROWS.map((row) => (
                      <tr key={row.rowNumber} className={row.status === "invalid" ? "bg-error-bg/30" : ""}>
                        <td className="px-5 py-2.5">{row.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{row.icNumber}</td>
                        <td className="px-4 py-2.5">{row.classGroup}</td>
                        <td className="px-4 py-2.5">
                          {row.status === "valid"
                            ? <StatusBadge status="verified" />
                            : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-bg text-error border border-error-border">{row.errorReason}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-subtle rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Ready to Proceed?</p>
                  <p className="text-xs text-muted mt-0.5">
                    442 valid records identified. 8 rows require manual correction in the review step.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    <Download size={14} />
                    Download Errors CSV
                  </Button>
                  <Button>
                    Proceed to Review →
                  </Button>
                </div>
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
