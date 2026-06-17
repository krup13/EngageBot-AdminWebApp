import type { AppNotification, CreateNotificationInput } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

export async function createNotification(data: CreateNotificationInput): Promise<AppNotification> {
  return apiClient.post<AppNotification>("/notifications", data);
}

export async function getNotifications(): Promise<AppNotification[]> {
  return apiClient.get<AppNotification[]>("/notifications");
}
