"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerTeacher } from "@/lib/api/teachers";
import { Teacher } from "@/lib/types";

const STEPS = [
  { number: 1, label: "Identity Details" },
  { number: 2, label: "Review Info" },
  { number: 3, label: "Registration Complete" },
];

export default function RegisterTeacherPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Teacher | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!email.trim()) e.email = "Work email is required.";
    else if (!email.includes("@")) e.email = "Enter a valid email address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (step === 1) {
      if (!validate()) return;
      setStep(2);
    } else if (step === 2) {
      setLoading(true);
      const teacher = await registerTeacher({ name, email, department: "Unassigned", assignedClasses: [] });
      setResult(teacher);
      setLoading(false);
      setStep(3);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text">Register Teacher</h2>
          <p className="text-sm text-muted mt-1">Add a new educator to the EngageBot system.</p>
        </div>
        <span className="text-xs font-medium text-primary bg-primary-light px-3 py-1.5 rounded-full">
          Academic Year 2026
        </span>
      </div>

      <div className="flex justify-center mb-10">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      <div className="bg-surface rounded-2xl border border-border p-8">
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus size={18} className="text-primary" />
              <h3 className="text-base font-semibold text-text">Identity &amp; Work Access</h3>
            </div>

            <Input
              label="Full Name"
              placeholder="e.g. Ahmad bin Ibrahim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <p className="text-xs font-semibold text-muted -mt-4 uppercase tracking-wide">
              Verification note: Please ensure name matches MyKad exactly for payroll alignment.
            </p>

            <Input
              label="Work Email Address"
              type="email"
              placeholder="teacher@moe.gov.my"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-base font-semibold text-text">Review Information</h3>
            <div className="rounded-xl bg-subtle border border-border p-5 flex flex-col gap-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted">Full Name</span>
                <span className="text-sm font-medium text-text">{name}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-4">
                <span className="text-sm text-muted">Work Email</span>
                <span className="text-sm font-medium text-text">{email}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-4">
                <span className="text-sm text-muted">Academic Year</span>
                <span className="text-sm font-medium text-text">2026</span>
              </div>
            </div>
            <p className="text-xs text-muted">
              Please review the information above. A system ID and temporary access credentials will be generated upon submission.
            </p>
          </div>
        )}

        {step === 3 && result && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center">
              <CheckCircle2 size={36} className="text-success" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text mb-1">Registration Complete</h3>
              <p className="text-sm text-muted">
                {result.name} has been successfully registered.
              </p>
            </div>
            <div className="bg-subtle rounded-xl border border-border px-6 py-4 w-full text-left">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted">System ID</span>
                <span className="text-sm font-mono font-semibold text-text">{result.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Email</span>
                <span className="text-sm text-text">{result.email}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        {step < 3 ? (
          <>
            <Link href="/register" className="text-sm text-muted hover:text-text transition-colors py-2">
              Cancel
            </Link>
            <Button onClick={handleSubmit} loading={loading}>
              {step === 1 ? "Proceed to Review →" : "Submit Registration"}
            </Button>
          </>
        ) : (
          <div className="flex gap-3 ml-auto">
            <Link href="/register">
              <Button variant="secondary">Register Another</Button>
            </Link>
            <Link href="/teachers">
              <Button>View Teachers</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
