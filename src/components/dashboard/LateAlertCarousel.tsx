"use client";

import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { db, isFirebaseConfigured } from "@/lib/firebase";
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

/**
 * Dashboard alert for teachers who are late to class. Real-time: an entry
 * disappears the moment that teacher checks in (UC-10). Multiple late teachers
 * rotate in a carousel on a 10-second interval.
 *
 * - Live (Firebase configured): subscribes to today's `classSchedules` and keeps
 *   only sessions where `isLate(...)` is true (past start + grace, not checkedIn).
 * - Dev (mock): synthesizes a couple of currently-late sessions and simulates one
 *   teacher checking in after ~18s, so the appear/rotate/clear behaviour is visible.
 */
export function LateAlertCarousel() {
  const [late, setLate] = useState<LateEntry[]>([]);
  const [index, setIndex] = useState(0);

  // ── Source the late list ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      // Synthesize late sessions anchored to "now" so they're genuinely overdue.
      const now = new Date();
      const start = new Date(now.getTime() - 10 * 60 * 1000);
      const seed: LateEntry[] = [
        { id: "late-1", teacherName: "Robert Tan Wei Keong", classGroup: "4 Bestari", subject: "English Language", startTime: hhmm(start) },
        { id: "late-2", teacherName: "Ahmad Faizal Bin Kassim", classGroup: "4A", subject: "History", startTime: hhmm(start) },
        { id: "late-3", teacherName: "Mohd Ridzuan bin Ismail", classGroup: "5C", subject: "P. Islam", startTime: hhmm(start) },
      ];
      setLate(seed);
      // Simulate one teacher checking in → that alert clears.
      const t = setTimeout(() => setLate((prev) => prev.filter((e) => e.id !== "late-2")), 18000);
      return () => clearTimeout(t);
    }

    // Live: react to schedule changes in real time.
    let unsub: (() => void) | undefined;
    (async () => {
      const { collection, onSnapshot, query, where } = await import("firebase/firestore");
      const today = dayOf(new Date());
      if (!today) return;
      const q = query(collection(db, "classSchedules"), where("day", "==", today));
      unsub = onSnapshot(q, (snap) => {
        const now = new Date();
        const entries = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ClassSession)
          .filter((s) => isLate(s, now))
          .map((s) => ({
            id: s.id,
            teacherName: s.teacherName,
            classGroup: s.classGroup,
            subject: s.subject,
            startTime: s.startTime,
          }));
        setLate(entries);
      });
    })();
    return () => unsub?.();
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
