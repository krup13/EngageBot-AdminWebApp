"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus, KeyRound, Copy, Check } from "lucide-react";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerTeacher } from "@/lib/api/teachers";
import { getSubjects } from "@/lib/api/subjects";
import type { Teacher, Subject } from "@/lib/types";

const STEPS = [
  { number: 1, label: "Identity Details" },
  { number: 2, label: "Assign Subjects" },
  { number: 3, label: "Review Info" },
  { number: 4, label: "Registration Complete" },
];

export default function RegisterTeacherPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<Teacher | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Step 2 state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    getSubjects().then(setSubjects);
  }, []);

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!email.trim()) e.email = "Work email is required.";
    else if (!email.includes("@")) e.email = "Enter a valid email address.";
    if (!password) {
      e.password = "Temporary password is required.";
    } else if (password.length < 8) {
      e.password = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      e.confirmPassword = "Please confirm the password.";
    } else if (password !== confirmPassword) {
      e.confirmPassword = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (step === 1) {
      if (!validate()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setLoading(true);
      setSubmitError("");
      try {
        const teacher = await registerTeacher({
          name,
          email,
          password,
          department: selectedSubjects.length > 0 ? selectedSubjects.join(", ") : "Unassigned",
          subjects: selectedSubjects,
          assignedClasses: [],
        });
        setResult(teacher);
        setStep(4);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  }

  function resetForm() {
    setStep(1);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSelectedSubjects([]);
    setErrors({});
    setSubmitError("");
    setResult(null);
    setCopied(false);
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {/* ── Step 1: Identity + password ────────────────────────────── */}
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

            <div className="border-t border-border pt-6 flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-primary" />
                <h4 className="text-sm font-semibold text-text">Temporary Login Password</h4>
              </div>
              <p className="text-xs text-muted -mt-4">
                Set a temporary password for the teacher. They will use this to log in to the mobile app.
                Share it with them securely — for example, in person or via your school&apos;s internal messaging.
              </p>

              <Input
                label="Temporary Password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                hint="At least 8 characters. The teacher can ask you to reset it later."
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter the password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Assign Subjects ──────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-base font-semibold text-text">Assign Subjects</h3>
            <p className="text-xs text-muted -mt-4">Select the subjects this teacher is qualified to teach. Class assignments are managed automatically through the classroom schedule.</p>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text">Subjects Taught</label>
              {subjects.length === 0
                ? <p className="text-xs text-muted">No subjects registered. <Link href="/subjects" className="text-primary underline">Add subjects first.</Link></p>
                : <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => {
                      const active = selectedSubjects.includes(s.name);
                      return (
                        <button key={s.id} type="button"
                          onClick={() => setSelectedSubjects((prev) => active ? prev.filter((x) => x !== s.name) : [...prev, s.name])}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "bg-primary text-white border-primary" : "bg-surface text-muted border-border hover:border-primary"}`}>
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ── Step 3: Review ─────────────────────────────────────────── */}
        {step === 3 && (
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
                <span className="text-sm text-muted">Temporary Password</span>
                <span className="text-sm font-mono text-muted tracking-widest">{"•".repeat(Math.min(password.length, 12))}</span>
              </div>
              {selectedSubjects.length > 0 && (
                <div className="flex justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted">Subjects</span>
                  <span className="text-sm font-medium text-text text-right max-w-[60%]">{selectedSubjects.join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-4">
                <span className="text-sm text-muted">Academic Year</span>
                <span className="text-sm font-medium text-text">2026</span>
              </div>
            </div>
            <p className="text-xs text-muted">
              Please review the information above. A system ID will be generated upon submission.
              The teacher will use the email and temporary password to sign in to the mobile app.
            </p>
          </div>
        )}

        {/* ── Step 4: Confirmation ───────────────────────────────────── */}
        {step === 4 && result && (
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

            {/* Credentials to share with teacher */}
            <div className="bg-subtle rounded-xl border border-border px-6 py-4 w-full text-left flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                Share these credentials with the teacher
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">System ID</span>
                <span className="text-sm font-mono font-semibold text-text">{result.employeeId}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-sm text-muted">Email</span>
                <span className="text-sm text-text">{result.email}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-sm text-muted">Temporary Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-text">{password}</span>
                  <button
                    onClick={copyPassword}
                    className="text-muted hover:text-primary transition-colors"
                    title="Copy password"
                  >
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted max-w-sm">
              The teacher should change their password after first login. If they forget it, you can
              update it from the Teachers page.
            </p>
          </div>
        )}
      </div>

      {submitError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex justify-between mt-6">
        {step < 4 ? (
          <>
            {step === 1 ? (
              <Link href="/register" className="text-sm text-muted hover:text-text transition-colors py-2">
                Cancel
              </Link>
            ) : (
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm text-muted hover:text-text transition-colors py-2"
              >
                ← Back
              </button>
            )}
            {step === 2 ? (
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(3)}>Skip for now</Button>
                <Button onClick={handleSubmit}>Continue →</Button>
              </div>
            ) : (
              <Button onClick={handleSubmit} loading={loading}>
                {step === 1 ? "Proceed to Subjects & Classes →" : "Submit Registration"}
              </Button>
            )}
          </>
        ) : (
          <div className="flex gap-3 ml-auto">
            <Button variant="secondary" onClick={resetForm}>Register Another</Button>
            <Link href="/teachers">
              <Button>View Teachers</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
