import type {
  SessionReport,
  MonthlyReportSummary,
  StudentEngagement,
  DroidObservation,
} from "@/lib/types";
import { isFirebaseConfigured, readWhere, where } from "@/lib/firestore";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SESSION_REPORTS: SessionReport[] = [
  // ── 2026-03-24 (Monday) ─────────────────────────────────────────────────────
  {
    id: "SR-001",
    date: "2026-03-24",
    subject: "Mathematics",
    classGroup: "4 Bestari",
    teacherName: "Cikgu Ahmad",
    droidId: "DRD-001",
    startTime: "08:00",
    endTime: "09:30",
    overallEngagement: "high",
    avgFocusScore: 78,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00101", studentName: "Ahmad Zulkifli", engagementLevel: "high", focusScore: 85, distractedCount: 1, participationScore: 82 },
      { studentId: "STU-00102", studentName: "Siti Nurhaliza", engagementLevel: "high", focusScore: 79, distractedCount: 2, participationScore: 76 },
      { studentId: "STU-00103", studentName: "Lim Wei Ming", engagementLevel: "medium", focusScore: 65, distractedCount: 4, participationScore: 60 },
      { studentId: "STU-00104", studentName: "Nurul Izzah Bt Ismail", engagementLevel: "high", focusScore: 88, distractedCount: 0, participationScore: 91 },
      { studentId: "STU-00105", studentName: "Chong Kah Wai", engagementLevel: "medium", focusScore: 61, distractedCount: 5, participationScore: 58 },
      { studentId: "STU-00106", studentName: "Ramasamy Subramaniam", engagementLevel: "low", focusScore: 42, distractedCount: 9, participationScore: 35 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "08:05", note: "Class settled promptly. 5 of 6 students showing active note-taking.", type: "general" },
      { timestamp: "08:22", note: "3 students showing distraction patterns near the window side.", type: "distraction" },
      { timestamp: "09:00", note: "Group problem-solving activity initiated; participation scores rising.", type: "participation" },
      { timestamp: "09:20", note: "Overall engagement sustained. Ramasamy Subramaniam showing signs of fatigue.", type: "engagement" },
    ] as DroidObservation[],
  },
  {
    id: "SR-002",
    date: "2026-03-24",
    subject: "English Language",
    classGroup: "4 Bestari",
    teacherName: "Pn. Sarah",
    droidId: "DRD-001",
    startTime: "09:30",
    endTime: "10:30",
    overallEngagement: "medium",
    avgFocusScore: 64,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00101", studentName: "Ahmad Zulkifli", engagementLevel: "medium", focusScore: 68, distractedCount: 3, participationScore: 65 },
      { studentId: "STU-00102", studentName: "Siti Nurhaliza", engagementLevel: "high", focusScore: 81, distractedCount: 1, participationScore: 84 },
      { studentId: "STU-00103", studentName: "Lim Wei Ming", engagementLevel: "low", focusScore: 38, distractedCount: 11, participationScore: 32 },
      { studentId: "STU-00104", studentName: "Nurul Izzah Bt Ismail", engagementLevel: "medium", focusScore: 72, distractedCount: 2, participationScore: 70 },
      { studentId: "STU-00105", studentName: "Chong Kah Wai", engagementLevel: "absent", focusScore: 0, distractedCount: 0, participationScore: 0 },
      { studentId: "STU-00106", studentName: "Ramasamy Subramaniam", engagementLevel: "medium", focusScore: 63, distractedCount: 4, participationScore: 60 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "09:35", note: "One student absent. Remaining students engaged with reading exercise.", type: "general" },
      { timestamp: "10:00", note: "Lim Wei Ming observed off-task for an extended period.", type: "distraction" },
      { timestamp: "10:20", note: "Class discussion activity boosted Siti Nurhaliza's participation score.", type: "participation" },
    ] as DroidObservation[],
  },
  {
    id: "SR-003",
    date: "2026-03-24",
    subject: "Bahasa Melayu",
    classGroup: "5 Amanah",
    teacherName: "En. Zulkarnain",
    droidId: "DRD-002",
    startTime: "08:00",
    endTime: "09:00",
    overallEngagement: "high",
    avgFocusScore: 82,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00201", studentName: "Farah Hana Bt Zahari", engagementLevel: "high", focusScore: 90, distractedCount: 0, participationScore: 88 },
      { studentId: "STU-00202", studentName: "Mohd Hafizuddin", engagementLevel: "high", focusScore: 84, distractedCount: 1, participationScore: 80 },
      { studentId: "STU-00203", studentName: "Tan Mei Ling", engagementLevel: "high", focusScore: 86, distractedCount: 1, participationScore: 83 },
      { studentId: "STU-00204", studentName: "Kavitha Rajendran", engagementLevel: "medium", focusScore: 71, distractedCount: 3, participationScore: 68 },
      { studentId: "STU-00205", studentName: "Amirul Hakim", engagementLevel: "medium", focusScore: 68, distractedCount: 4, participationScore: 65 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "08:08", note: "Strong engagement from the start. Students attentive to teacher instructions.", type: "engagement" },
      { timestamp: "08:35", note: "Essay writing task commenced. All students observed on-task.", type: "general" },
      { timestamp: "08:52", note: "2 students appear to be rushing their work; possible time pressure observed.", type: "general" },
    ] as DroidObservation[],
  },

  // ── 2026-03-25 (Tuesday) ─────────────────────────────────────────────────────
  {
    id: "SR-004",
    date: "2026-03-25",
    subject: "Chemistry",
    classGroup: "3 Cerdas",
    teacherName: "Pn. Lim",
    droidId: "DRD-003",
    startTime: "11:00",
    endTime: "12:30",
    overallEngagement: "medium",
    avgFocusScore: 59,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00301", studentName: "Zulaikha Bt Mansur", engagementLevel: "medium", focusScore: 66, distractedCount: 5, participationScore: 63 },
      { studentId: "STU-00302", studentName: "Bryan Ng", engagementLevel: "low", focusScore: 41, distractedCount: 10, participationScore: 38 },
      { studentId: "STU-00303", studentName: "Priya Devi", engagementLevel: "medium", focusScore: 74, distractedCount: 3, participationScore: 70 },
      { studentId: "STU-00304", studentName: "Hafiz Othman", engagementLevel: "low", focusScore: 45, distractedCount: 8, participationScore: 42 },
      { studentId: "STU-00305", studentName: "Lee Jia Xin", engagementLevel: "high", focusScore: 80, distractedCount: 1, participationScore: 78 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "11:05", note: "Lab safety briefing in progress. Students listening with moderate attention.", type: "general" },
      { timestamp: "11:30", note: "Experiment phase: Bryan Ng and Hafiz Othman repeatedly observed off-task.", type: "distraction" },
      { timestamp: "12:00", note: "Priya Devi and Lee Jia Xin demonstrating strong experimental technique.", type: "engagement" },
      { timestamp: "12:20", note: "Cleanup phase: attention levels dropped across the class.", type: "distraction" },
    ] as DroidObservation[],
  },
  {
    id: "SR-005",
    date: "2026-03-25",
    subject: "Add Maths",
    classGroup: "5C",
    teacherName: "En. Tan",
    droidId: "DRD-004",
    startTime: "11:00",
    endTime: "12:30",
    overallEngagement: "medium",
    avgFocusScore: 67,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00401", studentName: "Syafiqah Ahmad", engagementLevel: "high", focusScore: 83, distractedCount: 2, participationScore: 80 },
      { studentId: "STU-00402", studentName: "Ng Boon Keat", engagementLevel: "medium", focusScore: 69, distractedCount: 4, participationScore: 66 },
      { studentId: "STU-00403", studentName: "Darshini Pillai", engagementLevel: "medium", focusScore: 64, distractedCount: 5, participationScore: 61 },
      { studentId: "STU-00404", studentName: "Azri Hanafi", engagementLevel: "medium", focusScore: 71, distractedCount: 3, participationScore: 68 },
      { studentId: "STU-00405", studentName: "Michelle Ong", engagementLevel: "low", focusScore: 48, distractedCount: 8, participationScore: 44 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "11:15", note: "Droid connectivity intermittent. Partial data captured for this session.", type: "general" },
      { timestamp: "12:10", note: "Data capture resumed. Syafiqah Ahmad maintaining focus throughout.", type: "engagement" },
    ] as DroidObservation[],
  },

  // ── 2026-03-26 (Wednesday) ──────────────────────────────────────────────────
  {
    id: "SR-006",
    date: "2026-03-26",
    subject: "Biology",
    classGroup: "4A",
    teacherName: "En. Rosli",
    droidId: "DRD-005",
    startTime: "11:30",
    endTime: "12:30",
    overallEngagement: "high",
    avgFocusScore: 80,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00501", studentName: "Aisyah Bt Ramli", engagementLevel: "high", focusScore: 87, distractedCount: 1, participationScore: 85 },
      { studentId: "STU-00502", studentName: "Kumar Selvam", engagementLevel: "high", focusScore: 82, distractedCount: 2, participationScore: 79 },
      { studentId: "STU-00503", studentName: "Jasmine Wong", engagementLevel: "high", focusScore: 84, distractedCount: 1, participationScore: 82 },
      { studentId: "STU-00504", studentName: "Fareez Izzudin", engagementLevel: "medium", focusScore: 71, distractedCount: 4, participationScore: 68 },
      { studentId: "STU-00505", studentName: "Nurul Ain Bt Hamid", engagementLevel: "medium", focusScore: 69, distractedCount: 4, participationScore: 66 },
      { studentId: "STU-00506", studentName: "Lim Jing Hao", engagementLevel: "high", focusScore: 88, distractedCount: 0, participationScore: 90 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "11:33", note: "Cell diagram activity initiated. High visual engagement observed.", type: "engagement" },
      { timestamp: "11:50", note: "Pair discussion mode: 5 of 6 pairs actively engaged.", type: "participation" },
      { timestamp: "12:10", note: "Fareez Izzudin and Nurul Ain diverging from task material.", type: "distraction" },
      { timestamp: "12:25", note: "Session winding down. Strong retention quiz scores predicted.", type: "general" },
    ] as DroidObservation[],
  },
  {
    id: "SR-007",
    date: "2026-03-26",
    subject: "History",
    classGroup: "4A",
    teacherName: "Pn. Siti",
    droidId: "DRD-005",
    startTime: "14:00",
    endTime: "15:00",
    overallEngagement: "low",
    avgFocusScore: 45,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00501", studentName: "Aisyah Bt Ramli", engagementLevel: "medium", focusScore: 58, distractedCount: 6, participationScore: 55 },
      { studentId: "STU-00502", studentName: "Kumar Selvam", engagementLevel: "low", focusScore: 38, distractedCount: 11, participationScore: 34 },
      { studentId: "STU-00503", studentName: "Jasmine Wong", engagementLevel: "low", focusScore: 42, distractedCount: 10, participationScore: 39 },
      { studentId: "STU-00504", studentName: "Fareez Izzudin", engagementLevel: "low", focusScore: 35, distractedCount: 13, participationScore: 30 },
      { studentId: "STU-00505", studentName: "Nurul Ain Bt Hamid", engagementLevel: "medium", focusScore: 60, distractedCount: 5, participationScore: 58 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "14:05", note: "Post-lunch session. Significant fatigue patterns detected across all students.", type: "engagement" },
      { timestamp: "14:25", note: "3 students showing repeated eye-closure events. Distraction count elevated.", type: "distraction" },
      { timestamp: "14:45", note: "Pn. Siti initiated Q&A to re-engage class. Partial improvement observed.", type: "participation" },
      { timestamp: "14:55", note: "Engagement did not recover to morning levels. Fatigue identified as likely factor.", type: "general" },
    ] as DroidObservation[],
  },
  {
    id: "SR-008",
    date: "2026-03-26",
    subject: "P. Islam",
    classGroup: "5C",
    teacherName: "Ustaz Hairul",
    droidId: "DRD-007",
    startTime: "15:00",
    endTime: "16:00",
    overallEngagement: "high",
    avgFocusScore: 84,
    status: "completed",
    studentEngagements: [
      { studentId: "STU-00401", studentName: "Syafiqah Ahmad", engagementLevel: "high", focusScore: 91, distractedCount: 0, participationScore: 89 },
      { studentId: "STU-00404", studentName: "Azri Hanafi", engagementLevel: "high", focusScore: 87, distractedCount: 1, participationScore: 84 },
      { studentId: "STU-00406", studentName: "Wardah Bt Ilani", engagementLevel: "high", focusScore: 88, distractedCount: 1, participationScore: 86 },
      { studentId: "STU-00407", studentName: "Haziq Mustafa", engagementLevel: "high", focusScore: 84, distractedCount: 2, participationScore: 81 },
      { studentId: "STU-00408", studentName: "Nur Hidayah Bt Zaidi", engagementLevel: "medium", focusScore: 70, distractedCount: 4, participationScore: 67 },
      { studentId: "STU-00409", studentName: "Farhan Idrus", engagementLevel: "medium", focusScore: 72, distractedCount: 3, participationScore: 69 },
    ] as StudentEngagement[],
    droidObservations: [
      { timestamp: "15:05", note: "Class begins with recitation. Strong engagement observed from the start.", type: "engagement" },
      { timestamp: "15:30", note: "Discussion segment in progress: all students actively participating.", type: "participation" },
      { timestamp: "15:52", note: "High focus maintained throughout. No significant distraction events recorded.", type: "general" },
    ] as DroidObservation[],
  },
];

// ── Query functions ───────────────────────────────────────────────────────────

// SessionReport documents are written by the droid + AI pipeline (separate
// codebase); the admin app only reads them. Stored in the "sessionReports"
// collection, keyed by an ISO "date" field ("YYYY-MM-DD").

export async function getSessionReports(date: string): Promise<SessionReport[]> {
  if (!isFirebaseConfigured()) {
    return MOCK_SESSION_REPORTS.filter((r) => r.date === date);
  }
  return readWhere<SessionReport>("sessionReports", where("date", "==", date));
}

export async function getMonthlyReport(
  month: number,
  year: number
): Promise<MonthlyReportSummary> {
  let sessions: SessionReport[];

  if (!isFirebaseConfigured()) {
    sessions = MOCK_SESSION_REPORTS.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  } else {
    // "YYYY-MM-DD" strings sort lexicographically, so a string range selects the month.
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    sessions = await readWhere<SessionReport>(
      "sessionReports",
      where("date", ">=", `${prefix}-01`),
      where("date", "<=", `${prefix}-31`)
    );
  }

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const avgEngagement =
    totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.avgFocusScore, 0) / totalSessions)
      : 0;

  const subjectMap = new Map<string, number[]>();
  sessions.forEach((s) => {
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

  return {
    month,
    year,
    classGroup: "all",
    totalSessions,
    completedSessions,
    avgEngagement,
    subjectBreakdown,
    sessionReports: sessions,
  };
}
