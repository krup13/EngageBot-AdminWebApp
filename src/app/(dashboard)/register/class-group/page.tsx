"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { registerClassGroup } from "@/lib/api/classrooms";

const ROOM_OPTIONS = [
  { value: "block-a-101", label: "Block A - Room 101" },
  { value: "block-a-102", label: "Block A - Room 102" },
  { value: "block-b-201", label: "Block B - Room 201" },
  { value: "block-b-202", label: "Block B - Room 202" },
  { value: "block-c-301", label: "Block C - Room 301" },
  { value: "lab-a", label: "Science Wing - Lab A" },
  { value: "lab-b", label: "Science Wing - Lab B" },
  { value: "hall-1", label: "Main Hall" },
  { value: "library", label: "Library" },
];

export default function RegisterClassGroupPage() {
  const [year] = useState("2026");
  const [room, setRoom] = useState("");
  const [className, setClassName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ room?: string; className?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!room) e.room = "Please select a room.";
    if (!className.trim()) e.className = "Class name is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    await registerClassGroup({ name: className, academicYear: Number(year), room });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-border p-10 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center">
            <Building2 size={32} className="text-success" />
          </div>
          <h3 className="text-lg font-bold text-text">Class Group Registered</h3>
          <p className="text-sm text-muted">
            <strong>{className}</strong> has been created for Academic Year {year}.
          </p>
          <div className="flex gap-3">
            <Link href="/register"><Button variant="secondary">Register Another</Button></Link>
            <Link href="/classrooms"><Button>View Classrooms</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text">Create New Class Group</h2>
        <p className="text-sm text-muted mt-1">
          Define a new student cohort and assign them to a physical room for the upcoming academic year.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-8 flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Building2 size={18} className="text-primary" />
          <h3 className="text-base font-semibold text-text">Class Information</h3>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text flex items-center gap-1.5">
            <span className="text-xs">📅</span> Academic Year
          </label>
          <input
            value={year}
            readOnly
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-subtle text-text"
          />
          <p className="text-xs text-muted">Year must be the current or upcoming academic year.</p>
        </div>

        <Select
          label="Allocated Room / Space"
          options={ROOM_OPTIONS}
          placeholder="Select a classroom or facility"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          error={errors.room}
          hint="Physical location where the Droid device is installed."
        />

        <Input
          label="Class Name"
          placeholder="e.g. 4 Bestari, 5 Cekap"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          error={errors.className}
          hint="Unique identifier used for scheduling and attendance reports."
        />
      </div>

      <div className="flex justify-between mt-6">
        <Link href="/register" className="text-sm text-muted hover:text-text transition-colors py-2 flex items-center gap-1">
          ← Cancel
        </Link>
        <Button onClick={handleSubmit} loading={loading}>
          Submit Registration
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {[
          {
            icon: HelpCircle,
            title: "What is a Class Group?",
            body: "A Class Group is a specific cohort of students that occupies a room for their main sessions. Registering a group allows the Droid in that room to begin tracking engagement for those specific students.",
          },
          {
            icon: HelpCircle,
            title: "Academic Year 2026",
            body: "Current system configurations are locked to the 2026 academic cycle. Ensure all Class Names align with the official Ministry of Education naming conventions.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={15} className="text-muted" />
              <h4 className="text-sm font-semibold text-text">{title}</h4>
            </div>
            <p className="text-xs text-muted leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
