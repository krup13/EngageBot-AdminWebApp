import type { SchoolSettings } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getSettings(): Promise<SchoolSettings> {
  return apiClient.get<SchoolSettings>("/settings");
}

export async function updateSettings(patch: Partial<SchoolSettings>): Promise<SchoolSettings> {
  return apiClient.patch<SchoolSettings>("/settings", patch);
}
