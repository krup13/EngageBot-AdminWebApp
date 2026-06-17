import type { Subject } from "@/lib/types";
import { apiClient, isConfigured } from "@/lib/api-client";

export const MOCK_SUBJECTS: Subject[] = [
  { id: "1", name: "Mathematics" },
  { id: "2", name: "Science" },
  { id: "3", name: "English Language" },
  { id: "4", name: "Bahasa Melayu" },
];

export async function getSubjects(): Promise<Subject[]> {
  if (!isConfigured()) return MOCK_SUBJECTS;
  return apiClient.get<Subject[]>("/subjects");
}

export async function createSubject(data: { name: string; description?: string }): Promise<Subject> {
  if (!isConfigured()) {
    const s: Subject = { id: String(Date.now()), name: data.name, description: data.description };
    MOCK_SUBJECTS.push(s);
    return s;
  }
  return apiClient.post<Subject>("/subjects", data);
}

export async function deleteSubject(id: string): Promise<void> {
  if (!isConfigured()) {
    const i = MOCK_SUBJECTS.findIndex((s) => s.id === id);
    if (i !== -1) MOCK_SUBJECTS.splice(i, 1);
    return;
  }
  await apiClient.delete(`/subjects/${id}`);
}
