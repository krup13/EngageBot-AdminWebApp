import type { Droid, CreateDroidInput } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function getDroids(): Promise<Droid[]> {
  return apiClient.get<Droid[]>("/droids");
}

export async function registerDroid(data: CreateDroidInput): Promise<Droid> {
  return apiClient.post<Droid>("/droids", data);
}
