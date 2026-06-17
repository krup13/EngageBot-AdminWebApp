import type { ClassSession, CreateClassSessionInput, SessionDay } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

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

export const DAYS: SessionDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export async function getSessions(): Promise<ClassSession[]> {
  return apiClient.get<ClassSession[]>("/schedules");
}

export async function createSession(data: CreateClassSessionInput): Promise<ClassSession> {
  return apiClient.post<ClassSession>("/schedules", data);
}

export type UpdateSessionInput = Partial<
  Pick<ClassSession, "subject" | "teacherId" | "teacherName" | "classGroup" | "startTime" | "endTime" | "day" | "status" | "color" | "checkedIn" | "checkInTime">
>;

export async function updateSession(id: string, patch: UpdateSessionInput): Promise<void> {
  await apiClient.patch(`/schedules/${id}`, patch);
}
