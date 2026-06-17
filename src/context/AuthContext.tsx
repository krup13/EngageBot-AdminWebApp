"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AdminUser } from "@/lib/types";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("engagebot_token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Verify the token is still valid and get the current user
    apiClient
      .get<AdminUser>("/auth/me")
      .then((adminUser) => setUser(adminUser))
      .catch(() => {
        // Token expired or invalid — clear it so the middleware redirects to /login
        localStorage.removeItem("engagebot_token");
        document.cookie = "engagebot-session=; path=/; max-age=0";
        setUser(null);
      })
      .finally(() => setLoading(false));
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
