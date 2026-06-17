import type { Teacher, CreateTeacherInput } from "@/lib/types";
import { apiClient, isConfigured } from "@/lib/api-client";

export const MOCK_TEACHERS: Teacher[] = [
  { id: "1", employeeId: "EB-2024-042", name: "Siti Aminah binti Yusof", email: "siti.aminah@moe.gov.my", department: "Science & Math", subjects: ["Mathematics", "Science"], assignedClasses: ["4 Bestari", "5 Amanah"], dateAdded: "2024-01-12", status: "active" },
  { id: "2", employeeId: "EB-2024-055", name: "Robert Tan Wei Keong", email: "robert.tan@moe.gov.my", department: "Languages", subjects: ["English Language", "Bahasa Melayu"], assignedClasses: ["3 Cekap", "6 Gigih"], dateAdded: "2024-01-15", status: "active" },
  { id: "3", employeeId: "EB-2024-089", name: "Ahmad Faizal Bin Kassim", email: "ahmad.faizal@moe.gov.my", department: "Social Studies", subjects: [], assignedClasses: ["4 Maju"], dateAdded: "2024-02-02", status: "active" },
  { id: "4", employeeId: "EB-2024-112", name: "Nandini Rajaratnam", email: "nandini.r@moe.gov.my", department: "Science & Math", subjects: ["Mathematics"], assignedClasses: ["5 Bestari", "5 Cekap"], dateAdded: "2024-03-10", status: "active" },
  { id: "5", employeeId: "EB-2024-156", name: "Mohd Ridzuan bin Ismail", email: "ridzuan@moe.gov.my", department: "Technical & Vocational", subjects: [], assignedClasses: ["6 Bestari", "6 Maju"], dateAdded: "2024-03-22", status: "active" },
];

export async function getTeachers(): Promise<Teacher[]> {
  if (!isConfigured()) return MOCK_TEACHERS;
  return apiClient.get<Teacher[]>("/teachers");
}

export async function registerTeacher(
  data: CreateTeacherInput & { password: string },
): Promise<Teacher> {
  if (!isConfigured()) {
    const email = data.email.trim().toLowerCase();
    const existing = MOCK_TEACHERS.find((t) => t.email.toLowerCase() === email);
    if (existing) return existing;
    const newTeacher: Teacher = {
      ...data,
      email,
      id: String(Date.now()),
      employeeId: `EB-2026-${String(MOCK_TEACHERS.length + 1).padStart(3, "0")}`,
      dateAdded: new Date().toISOString().split("T")[0],
      status: "pending",
    };
    MOCK_TEACHERS.push(newTeacher);
    return newTeacher;
  }
  return apiClient.post<Teacher>("/teachers", { ...data, email: data.email.trim().toLowerCase() });
}

export type UpdateTeacherInput = Partial<Pick<Teacher, "name" | "email" | "department" | "subjects" | "assignedClasses" | "status">>;

export async function updateTeacher(id: string, patch: UpdateTeacherInput): Promise<void> {
  if (!isConfigured()) {
    const t = MOCK_TEACHERS.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
    return;
  }
  await apiClient.patch(`/teachers/${id}`, patch);
}

export async function deleteTeacher(id: string): Promise<void> {
  if (!isConfigured()) {
    const i = MOCK_TEACHERS.findIndex((t) => t.id === id);
    if (i !== -1) MOCK_TEACHERS.splice(i, 1);
    return;
  }
  await apiClient.delete(`/teachers/${id}`);
}
