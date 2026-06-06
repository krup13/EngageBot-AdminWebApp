"use client";

import { useState } from "react";
import Link from "next/link";
import { Cpu, ChevronRight, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { registerDroid } from "@/lib/api/droids";
import { Droid } from "@/lib/types";

const ROOM_OPTIONS = [
  { value: "4-bestari", label: "4 Bestari" },
  { value: "5-amanah", label: "5 Amanah" },
  { value: "3-cerdas", label: "3 Cerdas" },
  { value: "6-gemilang", label: "6 Gemilang" },
  { value: "lab-a", label: "Lab A" },
  { value: "lab-b", label: "Lab B" },
  { value: "hall-1", label: "Hall 1" },
  { value: "library", label: "Library" },
];

export default function RegisterDroidPage() {
  const [step, setStep] = useState(1);
  const [serial, setSerial] = useState("");
  const [room, setRoom] = useState("");
  const [firmware, setFirmware] = useState("v2.1.0-stable");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Droid | null>(null);
  const [errors, setErrors] = useState<{ serial?: string; room?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!serial.trim()) e.serial = "Device serial number is required.";
    if (!room) e.room = "Please select a classroom.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleReviewAndProceed() {
    if (!validate()) return;
    setStep(2);
  }

  async function handleSubmit() {
    setLoading(true);
    const droid = await registerDroid({ serialNumber: serial, assignedRoom: room, firmware, telemetryNotes: notes });
    setResult(droid);
    setLoading(false);
    setStep(3);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <button
          onClick={() => step > 1 && setStep(step - 1)}
          className={`flex items-center gap-1.5 font-medium ${step === 1 ? "text-primary" : "text-muted hover:text-text cursor-pointer"}`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step === 1 ? "bg-primary border-primary text-white" : "border-border text-muted"}`}>
            1
          </span>
          Registration
        </button>
        <ChevronRight size={16} className="text-muted" />
        <span className={`flex items-center gap-1.5 font-medium ${step >= 2 ? "text-primary" : "text-muted"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step >= 2 ? "bg-primary border-primary text-white" : "border-border text-muted"}`}>
            2
          </span>
          Review
        </span>
      </div>

      {step < 3 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text">Hardware Registration</h2>
          <p className="text-sm text-muted mt-1">Onboard a new EngageBot Droid to the classroom network.</p>
        </div>
      )}

      {/* Step 1: Registration form */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-border p-8">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
            <Cpu size={18} className="text-primary" />
            <div>
              <h3 className="text-base font-semibold text-text">Device Specifications</h3>
              <p className="text-xs text-muted">Enter the physical device identifiers and its classroom location.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Device Serial Number</label>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="e.g. SN-992-001"
                className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-1 ${errors.serial ? "border-error focus:ring-error" : "border-border focus:border-primary focus:ring-primary"}`}
              />
              <p className="text-xs text-muted">Found on the sticker underneath the Droid chassis.</p>
              {errors.serial && <p className="text-xs text-error">{errors.serial}</p>}
            </div>

            <Select
              label="Assigned Room / Class Group"
              options={ROOM_OPTIONS}
              placeholder="Select Classroom"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              error={errors.room}
              hint="Mapping for AI telemetry analysis."
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">
                Firmware Version <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input
                value={firmware}
                onChange={(e) => setFirmware(e.target.value)}
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Last Seen Status</label>
              <input
                value="Waiting for first ping…"
                readOnly
                className="rounded-lg border border-border px-3 py-2.5 text-sm bg-subtle text-muted"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Telemetry &amp; Deployment Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="e.g. Unit mounted on front-left ceiling bracket. Calibration needed."
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-border p-8">
          <h3 className="text-base font-semibold text-text mb-6">Review &amp; Confirm</h3>
          <div className="flex flex-col gap-4 bg-subtle rounded-xl border border-border p-5">
            {[
              ["Serial Number", serial],
              ["Assigned Room", ROOM_OPTIONS.find((o) => o.value === room)?.label ?? room],
              ["Firmware Version", firmware || "Not specified"],
              ["Last Seen Status", "Waiting for first ping…"],
              ...(notes ? [["Deployment Notes", notes]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-muted">{label}</span>
                <span className="text-sm font-medium text-text text-right max-w-xs">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && result && (
        <div className="bg-white rounded-2xl border border-border p-10 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center">
            <CheckCircle2 size={36} className="text-success" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text mb-1">Droid Registered Successfully</h3>
            <p className="text-sm text-muted">
              {result.droidId} ({result.serialNumber}) has been added to the fleet.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/register"><Button variant="secondary">Register Another</Button></Link>
            <Link href="/droids"><Button>View Fleet</Button></Link>
          </div>
        </div>
      )}

      {step < 3 && (
        <div className="flex justify-between mt-6">
          <Link href="/register" className="text-sm text-muted hover:text-text py-2">
            Cancel
          </Link>
          <Button
            onClick={step === 1 ? handleReviewAndProceed : handleSubmit}
            loading={loading}
          >
            {step === 1 ? "Review & Proceed" : "Submit Registration"}
          </Button>
        </div>
      )}
    </div>
  );
}
