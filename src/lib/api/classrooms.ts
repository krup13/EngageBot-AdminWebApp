import type { ClassGroup, CreateClassGroupInput } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getClassrooms(): Promise<ClassGroup[]> {
  return apiClient.get<ClassGroup[]>("/class-groups");
}

export async function registerClassGroup(data: CreateClassGroupInput): Promise<ClassGroup> {
  return apiClient.post<ClassGroup>("/class-groups", data);
}

export async function updateClassroom(
  id: string,
  patch: Partial<Pick<ClassGroup, "name" | "academicYear" | "room" | "droidId">>,
): Promise<ClassGroup> {
  return apiClient.patch<ClassGroup>(`/class-groups/${id}`, patch);
}

export async function deleteClassroom(id: string): Promise<void> {
  await apiClient.delete(`/class-groups/${id}`);
}
