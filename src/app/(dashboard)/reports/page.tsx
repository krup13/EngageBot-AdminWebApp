"use client";

import { useState, useEffect } from "react";
import {
  Printer,
  ChevronDown,
  CalendarDays,
  BarChart2,
  Users,
  CheckCircle,
  Cpu,
} from "lucide-react";
import { TabToggle } from "@/components/ui/TabToggle";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { getSessionReports, getMonthlyReport } from "@/lib/api/reports";
import type {
  SessionReport,
  MonthlyReportSummary,
  StudentEngagement,
  DroidObservation,
  EngagementLevel,
} from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function engagementVariant(
  level: EngagementLevel
): "success" | "warning" | "error" | "neutral" {
  if (level === "high") return "success";
  if (level === "medium") return "warning";
  if (level === "low") return "error";
  return "neutral";
}

function sessionDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const OBS_TYPE_VARIANT: Record<
  DroidObservation["type"],
  "success" | "warning" | "error" | "neutral" | "info"
> = {
  engagement: "success",
  distraction: "error",
  participation: "info",
  general: "neutral",
};

const CLASS_OPTIONS = [
  { value: "all", label: "All Classes" },
  { value: "4 Bestari", label: "4 Bestari" },
  { value: "5 Amanah", label: "5 Amanah" },
  { value: "3 Cerdas", label: "3 Cerdas" },
  { value: "5C", label: "5C" },
  { value: "4A", label: "4A" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StudentTable({ engagements }: { engagements: StudentEngagement[] }) {
  return (
    <div className="border-t border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-subtle border-b border-border">
            {["Student", "Engagement", "Focus", "Distractions", "Participation"].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {engagements.map((se) => (
            <tr key={se.studentId} className="hover:bg-subtle">
              <td className="px-4 py-2.5 font-medium text-text">{se.studentName}</td>
              <td className="px-4 py-2.5">
                <Badge
                  label={capitalize(se.engagementLevel)}
                  variant={engagementVariant(se.engagementLevel)}
                />
              </td>
              <td className="px-4 py-2.5 text-text">{se.focusScore}%</td>
              <td className="px-4 py-2.5 text-text">{se.distractedCount}</td>
              <td className="px-4 py-2.5 text-text">{se.participationScore}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ObservationsList({ observations }: { observations: DroidObservation[] }) {
  return (
    <div className="border-t border-border px-5 py-4 space-y-3">
      {observations.map((obs, i) => (
        <div key={i} className="flex items-start gap-3 text-sm">
          <span className="font-mono text-xs text-muted shrink-0 mt-0.5 w-10">{obs.timestamp}</span>
          <span className="text-text flex-1">{obs.note}</span>
          <Badge
            label={capitalize(obs.type)}
            variant={OBS_TYPE_VARIANT[obs.type]}
            className="shrink-0"
          />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState("2026-03-24");
  const [selectedMonth, setSelectedMonth] = useState(3);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [classFilter, setClassFilter] = useState("all");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedSection, setExpandedSection] = useState<Map<string, "students" | "droid">>(
    new Map()
  );
  const [printingSession, setPrintingSession] = useState<string | null>(null);

  // Print single session — wait for React re-render before opening print dialog
  useEffect(() => {
    if (!printingSession) return;
    const cleanup = () => setPrintingSession(null);
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    return () => window.removeEventListener("afterprint", cleanup);
  }, [printingSession]);

  // ── Daily data ──────────────────────────────────────────────────────────────
  const [dailyAll, setDailyAll] = useState<SessionReport[]>([]);
  useEffect(() => {
    let active = true;
    getSessionReports(selectedDate).then((r) => {
      if (active) setDailyAll(r);
    });
    return () => {
      active = false;
    };
  }, [selectedDate]);

  const dailySessions = dailyAll.filter(
    (s) => classFilter === "all" || s.classGroup === classFilter
  );

  // ── Monthly data ────────────────────────────────────────────────────────────
  const [monthlyData, setMonthlyData] = useState<MonthlyReportSummary | null>(null);
  useEffect(() => {
    let active = true;
    getMonthlyReport(selectedMonth, selectedYear).then((r) => {
      if (active) setMonthlyData(r);
    });
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear]);

  const filteredMonthly = (monthlyData?.sessionReports ?? []).filter(
    (s) => classFilter === "all" || s.classGroup === classFilter
  );

  const filteredAvgEngagement =
    filteredMonthly.length > 0
      ? Math.round(filteredMonthly.reduce((sum, s) => sum + s.avgFocusScore, 0) / filteredMonthly.length)
      : 0;

  // Most engaged class (highest avg focus)
  const classScoreMap = new Map<string, number[]>();
  filteredMonthly.forEach((s) => {
    if (!classScoreMap.has(s.classGroup)) classScoreMap.set(s.classGroup, []);
    classScoreMap.get(s.classGroup)!.push(s.avgFocusScore);
  });
  const mostEngagedClass =
    [...classScoreMap.entries()]
      .map(([cls, scores]) => ({
        cls,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.avg - a.avg)[0]?.cls ?? "—";

  // Subject breakdown bar chart data
  const subjectMap = new Map<string, number[]>();
  filteredMonthly.forEach((s) => {
    if (!subjectMap.has(s.subject)) subjectMap.set(s.subject, []);
    subjectMap.get(s.subject)!.push(s.avgFocusScore);
  });
  const subjectBreakdown = Array.from(subjectMap.entries())
    .map(([subject, scores]) => ({
      subject,
      avgEngagement: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      sessionCount: scores.length,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  function toggleSection(sessionId: string, section: "students" | "droid") {
    setExpandedSection((prev) => {
      const next = new Map(prev);
      if (next.get(sessionId) === section) next.delete(sessionId);
      else next.set(sessionId, section);
      return next;
    });
  }

  function toggleExpanded(sessionId: string) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  const selectClass =
    "h-9 px-3 text-sm border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="p-6 flex flex-col gap-6 max-w-screen-xl">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-text">Engagement Reports</h2>
          <p className="text-sm text-muted mt-0.5">
            Droid-generated session data by day and month
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="print-hide flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted border border-border rounded-lg bg-surface hover:bg-subtle transition-colors"
        >
          <Printer size={16} />
          {activeTab === "daily" ? "Print All Sessions" : "Print Monthly Report"}
        </button>
      </div>

      {/* Tab toggle */}
      <div className="print-hide">
        <TabToggle
          tabs={[
            { label: "Daily Report", value: "daily" },
            { label: "Monthly Report", value: "monthly" },
          ]}
          active={activeTab}
          onChange={(v) => setActiveTab(v as "daily" | "monthly")}
        />
      </div>

      {/* Filter toolbar */}
      <div className="print-hide flex flex-wrap items-center gap-3">
        {activeTab === "daily" ? (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={selectClass}
          />
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className={selectClass}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 w-24 px-3 text-sm border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className={selectClass}
        >
          {CLASS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* ═══ DAILY VIEW ═════════════════════════════════════════════════════════ */}
      {activeTab === "daily" && (
        <div className="flex flex-col gap-4">
          {dailySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mb-4">
                <CalendarDays size={28} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-text">No sessions found</p>
              <p className="text-xs text-muted mt-1">
                Try a different date or class filter.
              </p>
            </div>
          ) : (
            dailySessions.map((session) => {
              const sectionOpen = expandedSection.get(session.id);
              const isHidden = printingSession && printingSession !== session.id;
              return (
                <div
                  key={session.id}
                  data-session-id={session.id}
                  className={`print-session-card bg-surface rounded-xl border border-border overflow-hidden${isHidden ? " print:hidden" : ""}`}
                >
                  {/* Card header */}
                  <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-text">{session.subject}</h3>
                        <Badge
                          label={`${capitalize(session.overallEngagement)} Engagement`}
                          variant={engagementVariant(session.overallEngagement)}
                        />
                        <StatusBadge status={session.status} />
                      </div>
                      <p className="text-xs text-muted">
                        {session.classGroup} · {session.startTime}–{session.endTime} ·{" "}
                        {session.teacherName} · {session.droidId}
                      </p>
                      <p className="text-xs text-muted">
                        Avg Focus:{" "}
                        <span className="font-semibold text-text">{session.avgFocusScore}%</span>
                        &ensp;·&ensp;Students:{" "}
                        <span className="font-semibold text-text">
                          {session.studentEngagements.length}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap print-hide">
                      <button
                        onClick={() => toggleSection(session.id, "students")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          sectionOpen === "students"
                            ? "bg-primary-light border-primary/30 text-primary"
                            : "bg-surface border-border text-muted hover:bg-subtle"
                        }`}
                      >
                        <Users size={13} />
                        Student Details
                        <ChevronDown
                          size={13}
                          className={`transition-transform ${sectionOpen === "students" ? "rotate-180" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => toggleSection(session.id, "droid")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          sectionOpen === "droid"
                            ? "bg-primary-light border-primary/30 text-primary"
                            : "bg-surface border-border text-muted hover:bg-subtle"
                        }`}
                      >
                        <Cpu size={13} />
                        Droid Observations
                        <ChevronDown
                          size={13}
                          className={`transition-transform ${sectionOpen === "droid" ? "rotate-180" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => setPrintingSession(session.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted hover:bg-subtle transition-colors"
                      >
                        <Printer size={13} />
                        Print
                      </button>
                    </div>
                  </div>

                  {sectionOpen === "students" && (
                    <StudentTable engagements={session.studentEngagements} />
                  )}
                  {sectionOpen === "droid" && (
                    <ObservationsList observations={session.droidObservations} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ MONTHLY VIEW ═══════════════════════════════════════════════════════ */}
      {activeTab === "monthly" && (
        <div className="flex flex-col gap-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={CalendarDays}
              label="Total Sessions"
              value={String(filteredMonthly.length)}
              subtext={`${filteredMonthly.filter((s) => s.status === "completed").length} completed`}
            />
            <StatCard
              icon={BarChart2}
              label="Avg Engagement"
              value={`${filteredAvgEngagement}%`}
              subtext="Focus score across all sessions"
            />
            <StatCard
              icon={Users}
              label="Most Engaged Class"
              value={mostEngagedClass}
              subtext="Highest avg focus score"
            />
            <StatCard
              icon={CheckCircle}
              label="Completed"
              value={`${filteredMonthly.filter((s) => s.status === "completed").length} / ${filteredMonthly.length}`}
              subtext="Sessions this period"
            />
          </div>

          {/* Subject engagement breakdown bar chart */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text mb-4">
              Subject Engagement Breakdown
            </h3>
            {subjectBreakdown.length === 0 ? (
              <p className="text-sm text-muted">No data for this period.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {subjectBreakdown.map(({ subject, avgEngagement, sessionCount }) => (
                  <div key={subject} className="flex items-center gap-3">
                    <span className="text-xs text-muted w-32 shrink-0 text-right">{subject}</span>
                    <div className="flex-1 bg-subtle rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${avgEngagement}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-text w-10 shrink-0 text-right">
                      {avgEngagement}%
                    </span>
                    <span className="text-xs text-muted w-20 shrink-0">
                      {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session log table */}
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Session Log</h3>
              <span className="text-xs text-muted">{filteredMonthly.length} sessions</span>
            </div>
            {filteredMonthly.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">
                No sessions match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-subtle">
                      {[
                        "Date", "Subject", "Class", "Teacher", "Duration", "Avg Focus", "Status", "",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonthly.flatMap((session) => {
                      const isExpanded = expandedSessions.has(session.id);
                      const duration = sessionDurationMinutes(session.startTime, session.endTime);
                      return [
                        <tr
                          key={session.id}
                          onClick={() => toggleExpanded(session.id)}
                          className="border-b border-border hover:bg-subtle cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-muted text-xs">{session.date}</td>
                          <td className="px-4 py-3 font-medium text-text">{session.subject}</td>
                          <td className="px-4 py-3 text-text">{session.classGroup}</td>
                          <td className="px-4 py-3 text-muted">{session.teacherName}</td>
                          <td className="px-4 py-3 text-muted">{duration} min</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-subtle rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${session.avgFocusScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-text">{session.avgFocusScore}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={session.status} />
                          </td>
                          <td className="px-4 py-3">
                            <ChevronDown
                              size={16}
                              className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </td>
                        </tr>,
                        ...(isExpanded
                          ? [
                              <tr key={`${session.id}-detail`}>
                                <td colSpan={8} className="bg-subtle border-b border-border">
                                  <div className="px-4 pt-3 pb-1">
                                    <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                                      Student Engagement
                                    </p>
                                  </div>
                                  <StudentTable engagements={session.studentEngagements} />
                                  <div className="px-4 pt-3 pb-1 border-t border-border mt-2">
                                    <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                                      Droid Observations
                                    </p>
                                  </div>
                                  <ObservationsList observations={session.droidObservations} />
                                  <div className="h-2" />
                                </td>
                              </tr>,
                            ]
                          : []),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
