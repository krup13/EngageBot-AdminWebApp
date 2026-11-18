import type { Droid, CreateDroidInput } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getDroids(): Promise<Droid[]> {
  return apiClient.get<Droid[]>("/droids");
}

export async function registerDroid(data: CreateDroidInput): Promise<Droid> {
  return apiClient.post<Droid>("/droids", data);
}

export type UpdateDroidInput = Partial<
  Pick<Droid, "serialNumber" | "assignedRoom" | "firmware" | "telemetryNotes"> & { status: "active" | "inactive" }
>;

// Changing assignedRoom also updates that classroom's droid on the server.
export async function updateDroid(id: string, patch: UpdateDroidInput): Promise<Droid> {
  return apiClient.patch<Droid>(`/droids/${id}`, patch);
}

export async function deleteDroid(id: string): Promise<void> {
  await apiClient.delete(`/droids/${id}`);
}
