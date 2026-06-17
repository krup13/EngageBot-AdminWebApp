import type { ClassSession, CreateClassSessionInput, SessionDay } from "@/lib/types";
import { apiClient, isConfigured } from "@/lib/api-client";

export const SESSION_COLORS: Record<string, string> = {
  Mathematics: "#DBEAFE",
  "Bahasa Melayu": "#FEF9C3",
  "English Language": "#EDE9FE",
  Chemistry: "#DCFCE7",
  Physics: "#FEE2E2",
  Science: "#CFFAFE",
  Biology: "#D1FAE5",
  History: "#F3F4F6",
  "Add Maths": "#FEF3C7",
  "P. Islam": "#ECFDF5",
};

export const MOCK_SESSIONS: ClassSession[] = [
  { id: "1", subject: "Mathematics", teacherId: "1", teacherName: "Siti Aminah binti Yusof", classGroup: "4 Bestari", startTime: "08:00", endTime: "09:30", day: "monday", status: "ongoing", color: SESSION_COLORS["Mathematics"] },
  { id: "2", subject: "English Language", teacherId: "2", teacherName: "Robert Tan Wei Keong", classGroup: "4 Bestari", startTime: "09:30", endTime: "10:30", day: "monday", status: "scheduled", color: SESSION_COLORS["English Language"] },
  { id: "3", subject: "Bahasa Melayu", teacherId: "2", teacherName: "Robert Tan Wei Keong", classGroup: "5 Amanah", startTime: "08:00", endTime: "09:00", day: "tuesday", status: "scheduled", color: SESSION_COLORS["Bahasa Melayu"] },
  { id: "4", subject: "Chemistry", teacherId: "4", teacherName: "Nandini Rajaratnam", classGroup: "3 Cerdas", startTime: "11:00", endTime: "12:30", day: "wednesday", status: "scheduled", color: SESSION_COLORS["Chemistry"] },
  { id: "5", subject: "Biology", teacherId: "4", teacherName: "Nandini Rajaratnam", classGroup: "4A", startTime: "11:30", endTime: "12:30", day: "wednesday", status: "scheduled", color: SESSION_COLORS["Biology"] },
  { id: "6", subject: "History", teacherId: "3", teacherName: "Ahmad Faizal Bin Kassim", classGroup: "4A", startTime: "14:00", endTime: "15:00", day: "wednesday", status: "scheduled", color: SESSION_COLORS["History"] },
  { id: "7", subject: "Add Maths", teacherId: "1", teacherName: "Siti Aminah binti Yusof", classGroup: "5C", startTime: "11:00", endTime: "12:30", day: "wednesday", status: "scheduled", color: SESSION_COLORS["Add Maths"] },
  { id: "8", subject: "P. Islam", teacherId: "5", teacherName: "Mohd Ridzuan bin Ismail", classGroup: "5C", startTime: "15:00", endTime: "16:00", day: "wednesday", status: "scheduled", color: SESSION_COLORS["P. Islam"] },
];

export const DAYS: SessionDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export async function getSessions(): Promise<ClassSession[]> {
  if (!isConfigured()) return MOCK_SESSIONS;
  return apiClient.get<ClassSession[]>("/schedules");
}

export async function createSession(data: CreateClassSessionInput): Promise<ClassSession> {
  if (!isConfigured()) {
    const newSession: ClassSession = {
      ...data,
      id: String(Date.now()),
      status: "scheduled",
      color: SESSION_COLORS[data.subject] ?? "#F3F4F6",
    };
    MOCK_SESSIONS.push(newSession);
    return newSession;
  }
  return apiClient.post<ClassSession>("/schedules", data);
}

export type UpdateSessionInput = Partial<
  Pick<ClassSession, "subject" | "teacherId" | "teacherName" | "classGroup" | "startTime" | "endTime" | "day" | "status" | "color" | "checkedIn" | "checkInTime">
>;

export async function updateSession(id: string, patch: UpdateSessionInput): Promise<void> {
  if (!isConfigured()) {
    const s = MOCK_SESSIONS.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    return;
  }
  await apiClient.patch(`/schedules/${id}`, patch);
}
