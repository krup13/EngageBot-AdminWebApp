"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, MoreVertical, Download, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MOCK_TEACHERS } from "@/lib/api/teachers";

export default function TeachersPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = MOCK_TEACHERS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  function toggleAll() {
    setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id));
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Teachers</h2>
          <p className="text-sm text-muted mt-1">Manage staff profiles, departmental roles, and class assignments.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm">
            <Download size={14} />
            Export Directory
          </Button>
          <Link href="/register/teacher">
            <Button size="sm">
              <UserPlus size={14} />
              Register New Teacher
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or email…"
            className="w-full rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
          />
        </div>
        <Button variant="secondary" size="sm">
          <Filter size={14} />
          Filters
        </Button>
        <button className="text-sm text-muted hover:text-text">Saved Presets</button>
        <span className="text-sm text-muted ml-auto">
          Showing <strong>{filtered.length}</strong> of <strong>124</strong> registered teachers
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-subtle">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="rounded border-border accent-primary"
                />
              </th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">NAME &amp; ID</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">DEPARTMENT</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">ASSIGNED CLASSES</th>
              <th className="text-left text-xs font-medium text-muted px-4 py-3">DATE ADDED</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-subtle transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="rounded border-border accent-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                        {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${t.status === "active" ? "bg-success" : t.status === "pending" ? "bg-warning" : "bg-muted"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-text">{t.name}</p>
                      <p className="text-xs text-muted">{t.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {t.department}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {t.assignedClasses.map((c) => (
                      <span key={c} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary border border-green-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted">
                  {new Date(t.dateAdded).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <button className="text-muted hover:text-text p-1 rounded transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
