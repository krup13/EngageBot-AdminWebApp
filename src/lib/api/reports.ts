import type {
  SessionReport,
  MonthlyReportSummary,
} from "@/lib/types";
import { apiClient, isConfigured } from "@/lib/api-client";

export const MOCK_SESSION_REPORTS: SessionReport[] = [
  {
    id: "SR-001", date: "2026-03-24", subject: "Mathematics", classGroup: "4 Bestari", teacherName: "Cikgu Ahmad", droidId: "DRD-001", startTime: "08:00", endTime: "09:30", overallEngagement: "high", avgFocusScore: 78, status: "completed",
    studentEngagements: [
      { studentId: "STU-00101", studentName: "Ahmad Zulkifli", engagementLevel: "high", focusScore: 85, distractedCount: 1, participationScore: 82 },
      { studentId: "STU-00102", studentName: "Siti Nurhaliza", engagementLevel: "high", focusScore: 79, distractedCount: 2, participationScore: 76 },
      { studentId: "STU-00103", studentName: "Lim Wei Ming", engagementLevel: "medium", focusScore: 65, distractedCount: 4, participationScore: 60 },
      { studentId: "STU-00104", studentName: "Nurul Izzah Bt Ismail", engagementLevel: "high", focusScore: 88, distractedCount: 0, participationScore: 91 },
      { studentId: "STU-00105", studentName: "Chong Kah Wai", engagementLevel: "medium", focusScore: 61, distractedCount: 5, participationScore: 58 },
      { studentId: "STU-00106", studentName: "Ramasamy Subramaniam", engagementLevel: "low", focusScore: 42, distractedCount: 9, participationScore: 35 },
    ],
    droidObservations: [
      { timestamp: "08:05", note: "Class settled promptly. 5 of 6 students showing active note-taking.", type: "general" },
      { timestamp: "08:22", note: "3 students showing distraction patterns near the window side.", type: "distraction" },
      { timestamp: "09:00", note: "Group problem-solving activity initiated; participation scores rising.", type: "participation" },
      { timestamp: "09:20", note: "Overall engagement sustained. Ramasamy Subramaniam showing signs of fatigue.", type: "engagement" },
    ],
  },
  {
    id: "SR-002", date: "2026-03-24", subject: "English Language", classGroup: "4 Bestari", teacherName: "Pn. Sarah", droidId: "DRD-001", startTime: "09:30", endTime: "10:30", overallEngagement: "medium", avgFocusScore: 64, status: "completed",
    studentEngagements: [
      { studentId: "STU-00101", studentName: "Ahmad Zulkifli", engagementLevel: "medium", focusScore: 68, distractedCount: 3, participationScore: 65 },
      { studentId: "STU-00102", studentName: "Siti Nurhaliza", engagementLevel: "high", focusScore: 81, distractedCount: 1, participationScore: 84 },
      { studentId: "STU-00103", studentName: "Lim Wei Ming", engagementLevel: "low", focusScore: 38, distractedCount: 11, participationScore: 32 },
      { studentId: "STU-00104", studentName: "Nurul Izzah Bt Ismail", engagementLevel: "medium", focusScore: 72, distractedCount: 2, participationScore: 70 },
      { studentId: "STU-00105", studentName: "Chong Kah Wai", engagementLevel: "absent", focusScore: 0, distractedCount: 0, participationScore: 0 },
      { studentId: "STU-00106", studentName: "Ramasamy Subramaniam", engagementLevel: "medium", focusScore: 63, distractedCount: 4, participationScore: 60 },
    ],
    droidObservations: [
      { timestamp: "09:35", note: "One student absent. Remaining students engaged with reading exercise.", type: "general" },
      { timestamp: "10:00", note: "Lim Wei Ming observed off-task for an extended period.", type: "distraction" },
      { timestamp: "10:20", note: "Class discussion activity boosted Siti Nurhaliza's participation score.", type: "participation" },
    ],
  },
];

export async function getSessionReports(date: string): Promise<SessionReport[]> {
  if (!isConfigured()) return MOCK_SESSION_REPORTS.filter((r) => r.date === date);
  return apiClient.get<SessionReport[]>(`/reports?date=${date}`);
}

export async function getMonthlyReport(month: number, year: number): Promise<MonthlyReportSummary> {
  if (!isConfigured()) {
    const sessions = MOCK_SESSION_REPORTS.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.status === "completed").length;
    const avgEngagement = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.avgFocusScore, 0) / totalSessions) : 0;
    const subjectMap = new Map<string, number[]>();
    sessions.forEach((s) => {
      if (!subjectMap.has(s.subject)) subjectMap.set(s.subject, []);
      subjectMap.get(s.subject)!.push(s.avgFocusScore);
    });
    const subjectBreakdown = Array.from(subjectMap.entries())
      .map(([subject, scores]) => ({ subject, avgEngagement: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), sessionCount: scores.length }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
    return { month, year, classGroup: "all", totalSessions, completedSessions, avgEngagement, subjectBreakdown, sessionReports: sessions };
  }
  return apiClient.get<MonthlyReportSummary>(`/reports/monthly?month=${month}&year=${year}`);
}
