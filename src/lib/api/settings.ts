import type { SchoolSettings } from "@/lib/types";
import { apiClient, isConfigured } from "@/lib/api-client";

let mockSettings: SchoolSettings = { recessTime: "" };

export async function getSettings(): Promise<SchoolSettings> {
  if (!isConfigured()) return { ...mockSettings };
  return apiClient.get<SchoolSettings>("/settings");
}

export async function updateSettings(patch: Partial<SchoolSettings>): Promise<SchoolSettings> {
  if (!isConfigured()) {
    mockSettings = { ...mockSettings, ...patch };
    return { ...mockSettings };
  }
  return apiClient.patch<SchoolSettings>("/settings", patch);
}
