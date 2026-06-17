"use client";

import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { apiClient } from "@/lib/api-client";
import { isLate, dayOf } from "@/lib/schedule-utils";
import type { ClassSession } from "@/lib/types";

interface LateEntry {
  id: string;
  teacherName: string;
  classGroup: string;
  subject: string;
  startTime: string;
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
 */
export function LateAlertCarousel() {
  const [late, setLate] = useState<LateEntry[]>([]);
  const [index, setIndex] = useState(0);

  // ── Source the late list ────────────────────────────────────────────────────
  useEffect(() => {
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
