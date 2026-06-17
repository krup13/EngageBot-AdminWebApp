import type { Student, CreateStudentInput } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getStudents(): Promise<Student[]> {
  return apiClient.get<Student[]>("/students");
}

export async function registerStudent(data: CreateStudentInput): Promise<Student> {
  return apiClient.post<Student>("/students", data);
}

export type UpdateStudentInput = Partial<Pick<Student, "name" | "icNumber" | "classGroup" | "status">>;

export async function updateStudent(id: string, patch: UpdateStudentInput): Promise<void> {
  await apiClient.patch(`/students/${id}`, patch);
}
