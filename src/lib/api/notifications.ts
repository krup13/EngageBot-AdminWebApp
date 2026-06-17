import type { AppNotification, CreateNotificationInput } from "@/lib/types";
import { apiClient, isConfigured } from "@/lib/api-client";

export const MOCK_NOTIFICATIONS: AppNotification[] = [];

export async function createNotification(data: CreateNotificationInput): Promise<AppNotification> {
  if (!isConfigured()) {
    const notification: AppNotification = {
      ...data,
      id: String(Date.now()),
      read: false,
      createdAt: new Date().toISOString(),
    };
    MOCK_NOTIFICATIONS.push(notification);
    return notification;
  }
  return apiClient.post<AppNotification>("/notifications", data);
}

export async function getNotifications(): Promise<AppNotification[]> {
  if (!isConfigured()) return MOCK_NOTIFICATIONS;
  return apiClient.get<AppNotification[]>("/notifications");
}
