import type { Subject } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getSubjects(): Promise<Subject[]> {
  return apiClient.get<Subject[]>("/subjects");
}

export async function createSubject(data: { name: string; description?: string }): Promise<Subject> {
  return apiClient.post<Subject>("/subjects", data);
}

export async function deleteSubject(id: string): Promise<void> {
  await apiClient.delete(`/subjects/${id}`);
}
