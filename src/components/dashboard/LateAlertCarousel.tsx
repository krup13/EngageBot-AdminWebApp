"use client";

import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { apiClient, isConfigured } from "@/lib/api-client";
import { isLate, dayOf } from "@/lib/schedule-utils";
import type { ClassSession } from "@/lib/types";

interface LateEntry {
  id: string;
  teacherName: string;
  classGroup: string;
  subject: string;
  startTime: string;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function fetchLateEntries(): Promise<LateEntry[]> {
  const today = dayOf(new Date());
  if (!today) return [];
  const sessions = await apiClient.get<ClassSession[]>(`/schedules?day=${today}`);
  const now = new Date();
  return sessions
    .filter((s) => isLate(s, now))
    .map((s) => ({
      id: s.id,
      teacherName: s.teacherName,
      classGroup: s.classGroup,
      subject: s.subject,
      startTime: s.startTime,
    }));
}

/**
 * Dashboard alert for teachers who are late to class. Polls the API every 30s
 * so the list stays fresh as teachers check in via the droid.
 *
 * In mock mode (API not configured), synthesizes a couple of late sessions and
 * simulates one teacher checking in after ~18s so the carousel behaviour is
 * visible during development.
 */
export function LateAlertCarousel() {
  const [late, setLate] = useState<LateEntry[]>([]);
  const [index, setIndex] = useState(0);

  // ── Source the late list ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured()) {
      const now = new Date();
      const start = new Date(now.getTime() - 10 * 60 * 1000);
      const seed: LateEntry[] = [
        { id: "late-1", teacherName: "Robert Tan Wei Keong", classGroup: "4 Bestari", subject: "English Language", startTime: hhmm(start) },
        { id: "late-2", teacherName: "Ahmad Faizal Bin Kassim", classGroup: "4A", subject: "History", startTime: hhmm(start) },
        { id: "late-3", teacherName: "Mohd Ridzuan bin Ismail", classGroup: "5C", subject: "P. Islam", startTime: hhmm(start) },
      ];
      setLate(seed);
      const t = setTimeout(() => setLate((prev) => prev.filter((e) => e.id !== "late-2")), 18000);
      return () => clearTimeout(t);
    }

    // Poll the API every 30 seconds for fresh late-teacher data.
    let active = true;
    async function poll() {
      try {
        const entries = await fetchLateEntries();
        if (active) setLate(entries);
      } catch {
        // Silently ignore — stale data is better than a crash.
      }
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // ── Rotate every 10s ────────────────────────────────────────────────────────
  useEffect(() => {
    if (late.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % late.length), 10000);
    return () => clearInterval(id);
  }, [late.length]);

  useEffect(() => {
    if (index >= late.length) setIndex(0);
  }, [late.length, index]);

  if (late.length === 0) return null;
  const e = late[late.length ? index % late.length : 0];
  if (!e) return null;

  return (
    <div className="relative">
      <AlertBanner
        variant="error"
        title="Teacher Late to Class"
        message={`${e.teacherName} has not checked in for ${e.subject} (${e.classGroup}), scheduled at ${e.startTime}.`}
        actions={
          late.length > 1 ? (
            <span className="text-xs font-medium text-error/80 whitespace-nowrap">
              {index + 1} / {late.length} late
            </span>
          ) : undefined
        }
      />
      {late.length > 1 && (
        <div className="absolute -bottom-1.5 left-0 right-0 flex justify-center gap-1">
          {late.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === index ? "w-4 bg-error" : "w-1.5 bg-error/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
