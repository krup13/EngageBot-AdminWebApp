import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "./firebase";
import type { AdminUser } from "./types";

const ALLOWED_DOMAINS = (
  process.env.NEXT_PUBLIC_ALLOWED_DOMAINS ?? "moe.gov.my"
).split(",").map((d) => d.trim());

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";
const BYPASS_KEY = "engagebot-dev-user";

export function isDomainAllowed(email: string): boolean {
  const domain = email.split("@")[1];
  return ALLOWED_DOMAINS.includes(domain);
}

function setSessionCookie() {
  document.cookie = `engagebot-session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
}

function clearSessionCookie() {
  document.cookie = "engagebot-session=; path=/; max-age=0";
}

export function getBypassUser(): AdminUser | null {
  if (!DEV_BYPASS || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BYPASS_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<{
  user: AdminUser | null;
  error: string | null;
}> {
  if (DEV_BYPASS) {
    const mockUser: AdminUser = {
      uid: "dev-bypass-uid",
      email: "khairanafisa4@gmail.com",
      displayName: "Khaira Nafisa",
      photoURL: null,
      role: "super_admin",
    };
    if (!isDomainAllowed(mockUser.email)) {
      const domains = ALLOWED_DOMAINS.join(" or @");
      return {
        user: null,
        error: `Access restricted to @${domains} accounts.`,
      };
    }
    sessionStorage.setItem(BYPASS_KEY, JSON.stringify(mockUser));
    setSessionCookie();
    return { user: mockUser, error: null };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    if (!firebaseUser.email || !isDomainAllowed(firebaseUser.email)) {
      await firebaseSignOut(auth);
      const domains = ALLOWED_DOMAINS.join(" or @");
      return {
        user: null,
        error: `Access restricted to @${domains} accounts. Please use your authorised work email.`,
      };
    }

    const appUser: AdminUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role: "super_admin",
    };

    setSessionCookie();
    return { user: appUser, error: null };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "auth/popup-closed-by-user") {
        return { user: null, error: null };
      }
    }
    return { user: null, error: "Sign-in failed. Please try again." };
  }
}

export async function signOut(): Promise<void> {
  if (DEV_BYPASS) {
    sessionStorage.removeItem(BYPASS_KEY);
    clearSessionCookie();
    return;
  }
  await firebaseSignOut(auth);
  clearSessionCookie();
}
