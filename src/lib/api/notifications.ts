import type { AppNotification, CreateNotificationInput } from "@/lib/types";
import { isFirebaseConfigured, readAll, create } from "@/lib/firestore";

const COLLECTION = "notifications";

// Notifications are WRITTEN by the admin app and DELIVERED by the mobile app
// (FCM, separate repo). This repo only creates the records. In mock mode they
// accumulate in memory so the flow is observable during development.
export const MOCK_NOTIFICATIONS: AppNotification[] = [];

export async function createNotification(
  data: CreateNotificationInput
): Promise<AppNotification> {
  const fields: Omit<AppNotification, "id"> = {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured()) {
    const notification: AppNotification = { ...fields, id: String(Date.now()) };
    MOCK_NOTIFICATIONS.push(notification);
    return notification;
  }

  return create<AppNotification>(COLLECTION, fields);
}

export async function getNotifications(): Promise<AppNotification[]> {
  if (!isFirebaseConfigured()) return MOCK_NOTIFICATIONS;
  return readAll<AppNotification>(COLLECTION);
}
