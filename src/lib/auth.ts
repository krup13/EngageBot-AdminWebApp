import { apiClient, setToken, clearToken } from './api-client';

// Google Calendar sync was tied to Google Sign-In (removed). Always returns
// null so the Calendar sync button in /schedules gracefully does nothing.
export function getCalendarToken(): string | null {
  return null;
}
import type { AdminUser } from './types';

function setSessionCookie() {
  document.cookie = `engagebot-session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
}

function clearSessionCookie() {
  document.cookie = 'engagebot-session=; path=/; max-age=0';
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: AdminUser | null; error: string | null }> {
  try {
    const { token, user } = await apiClient.post<{ token: string; user: AdminUser }>(
      '/auth/admin/login',
      { email, password },
    );
    setToken(token);
    setSessionCookie();
    return { user, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
    return { user: null, error: msg };
  }
}

export async function signOut(): Promise<void> {
  clearToken();
  clearSessionCookie();
}
