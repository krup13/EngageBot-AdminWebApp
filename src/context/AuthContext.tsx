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
        // Load (or create) the /users/{uid} profile so role comes from Firestore.
        const profile = await ensureUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: "admin",
        });
        setUser(profile);
      } else {
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
