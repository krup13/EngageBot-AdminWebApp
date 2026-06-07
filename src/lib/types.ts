// Core entity types — will map to Firestore collections once Firebase DB is integrated

// Maps to the /users/{authUid} document. Keyed by Firebase Auth UID.
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: "super_admin" | "admin" | "teacher";
  teacherId?: string; // set only for teacher accounts, links to /teachers/{id}
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedClasses: string[];
  dateAdded: string; // ISO date string
  status: "active" | "pending" | "inactive";
  employeeId: string; // e.g. EB-2024-042
  // Null until the teacher first signs into the mobile app with a matching
  // email; the mobile app links their Firebase Auth UID here. Login is gated
  // on a teacher record existing — see FIREBASE_SETUP.md.
  authUid?: string | null;
}

export type CreateTeacherInput = Omit<Teacher, "id" | "employeeId" | "dateAdded" | "status">;

export interface Student {
  id: string;
  name: string;
  icNumber: string; // MyKad / IC number
  classGroup: string;
  source: "manual" | "csv";
  status: "verified" | "pending" | "error";
  studentId: string; // e.g. STU-08821
  batchId?: string;
}

export type CreateStudentInput = Omit<Student, "id" | "studentId" | "source" | "status">;

export interface ClassGroup {
  id: string;
  name: string; // e.g. "4 Bestari"
  academicYear: number;
  room: string;
  droidId?: string;
}

export type CreateClassGroupInput = Omit<ClassGroup, "id">;

export interface Droid {
  id: string;
  droidId: string; // e.g. DRD-001
  serialNumber: string; // e.g. EB-9921-X1
  assignedRoom: string;
  firmware: string; // e.g. v2.1.4
  battery: number; // 0–100
  lastPing: string; // relative string e.g. "2 mins ago"
  status: "active" | "inactive" | "offline";
  telemetryNotes?: string;
}

export type CreateDroidInput = Omit<Droid, "id" | "droidId" | "battery" | "lastPing" | "status">;

export type SessionDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export interface ClassSession {
  id: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  classGroup: string;
  startTime: string; // "08:00"
  endTime: string;   // "09:30"
  day: SessionDay;
  status: "ongoing" | "scheduled" | "completed";
  color?: string;
}

export type CreateClassSessionInput = Omit<ClassSession, "id" | "status">;

export type DroidStatus = "ACTIVE" | "INACTIVE" | "OFFLINE";
export type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info";

// Used in CSV batch upload
export interface StudentCSVRow {
  name: string;
  icNumber: string;
  classGroup: string;
  rowNumber: number;
  status: "valid" | "invalid";
  errorReason?: string;
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type EngagementLevel = "high" | "medium" | "low" | "absent";

export interface StudentEngagement {
  studentId: string;
  studentName: string;
  engagementLevel: EngagementLevel;
  focusScore: number;          // 0–100
  distractedCount: number;
  participationScore: number;  // 0–100
}

export interface DroidObservation {
  timestamp: string;           // "HH:MM"
  note: string;
  type: "engagement" | "distraction" | "participation" | "general";
}

export interface SessionReport {
  id: string;
  date: string;                // "YYYY-MM-DD"
  subject: string;
  classGroup: string;
  teacherName: string;
  droidId: string;
  startTime: string;
  endTime: string;
  overallEngagement: EngagementLevel;
  avgFocusScore: number;
  studentEngagements: StudentEngagement[];
  droidObservations: DroidObservation[];
  status: "completed" | "in_progress";
}

export interface MonthlyReportSummary {
  month: number;
  year: number;
  classGroup: string;
  totalSessions: number;
  completedSessions: number;
  avgEngagement: number;
  subjectBreakdown: Array<{ subject: string; avgEngagement: number; sessionCount: number }>;
  sessionReports: SessionReport[];
}
