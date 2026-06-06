"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Cpu } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Admin Dashboard",
  "/teachers": "Teachers",
  "/students": "Students",
  "/classrooms": "Classrooms",
  "/droids": "EngageBot Droids",
  "/schedules": "Class Schedules",
  "/reports": "Reports",
  "/settings": "Settings",
  "/register": "Registration Hub",
  "/register/teacher": "Register Teacher",
  "/register/class-group": "Register Class Group",
  "/register/students": "Register Student(s)",
  "/register/droid": "Register Droid",
};

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Cpu size={32} className="text-primary animate-pulse" />
          <p className="text-sm text-muted">Loading EngageBot…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const title = PAGE_TITLES[pathname] ?? "EngageBot Admin";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardInner>{children}</DashboardInner>
    </AuthProvider>
  );
}
