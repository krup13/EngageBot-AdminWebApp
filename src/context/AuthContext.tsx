"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile } from "@/lib/api/users";
import type { AdminUser } from "@/lib/types";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEV_BYPASS) {
      // Always inject the dev user — no storage lookup needed, avoids cross-tab redirect loops
      setUser({
        uid: "dev-bypass-uid",
        email: "khairanafisa4@gmail.com",
        displayName: "Khaira Nafisa",
        photoURL: null,
        role: "super_admin",
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Render immediately from the auth record so a slow/unreachable
        // Firestore can never freeze the app on the loading screen.
        const basic: AdminUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: "admin",
        };
        setUser(basic);
        setLoading(false);

        // Enrich with the canonical /users/{uid} profile (real role) in the
        // background; keep the basic user if Firestore is unavailable.
        try {
          setUser(await ensureUserProfile(basic));
        } catch (err) {
          console.error("Failed to load user profile from Firestore:", err);
        }
        return;
      } else {
        // No real Firebase session — clear any stale proxy cookie (e.g. left over
        // from a previous dev-bypass session) so the route guard sends us to
        // /login instead of looping back to /dashboard.
        document.cookie = "engagebot-session=; path=/; max-age=0";
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
