"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  Cpu,
  Calendar,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "@/lib/auth";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Teachers", href: "/teachers", icon: Users },
  { label: "Students", href: "/students", icon: GraduationCap },
  { label: "Classrooms", href: "/classrooms", icon: Building2 },
  { label: "Droids", href: "/droids", icon: Cpu },
  { label: "Schedules", href: "/schedules", icon: Calendar },
  { label: "Reports", href: "/reports", icon: BarChart2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="w-48 shrink-0 bg-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
          <Cpu size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-base leading-tight">EngageBot</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pb-4 flex flex-col gap-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? "bg-sidebar-active text-white"
                  : "text-green-100 hover:bg-sidebar-hover hover:text-white"
                }`}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-5 border-t border-green-700/40 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-100 hover:bg-sidebar-hover hover:text-white transition-colors w-full"
        >
          <LogOut size={18} className="shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
