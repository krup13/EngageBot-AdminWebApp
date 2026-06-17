import type { AdminUser } from "@/lib/types";

// This file previously managed /users Firestore documents.
// User profile is now returned directly from POST /api/auth/admin/login.
// Keeping this export so existing imports don't break.

export async function ensureUserProfile(user: AdminUser): Promise<AdminUser> {
  return user;
}
