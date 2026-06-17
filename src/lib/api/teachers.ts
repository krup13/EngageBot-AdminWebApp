import type { Teacher, CreateTeacherInput } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getTeachers(): Promise<Teacher[]> {
  return apiClient.get<Teacher[]>("/teachers");
}

export async function registerTeacher(
  data: CreateTeacherInput & { password: string },
): Promise<Teacher> {
  return apiClient.post<Teacher>("/teachers", { ...data, email: data.email.trim().toLowerCase() });
}

export type UpdateTeacherInput = Partial<Pick<Teacher, "name" | "email" | "department" | "subjects" | "assignedClasses" | "status">>;

export async function updateTeacher(id: string, patch: UpdateTeacherInput): Promise<void> {
  await apiClient.patch(`/teachers/${id}`, patch);
}

export async function deleteTeacher(id: string): Promise<void> {
  await apiClient.delete(`/teachers/${id}`);
}
