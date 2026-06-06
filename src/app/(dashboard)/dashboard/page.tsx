"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, GraduationCap, Cpu, Calendar, UserPlus, Plus } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { TeachingSessionsTable } from "@/components/dashboard/TeachingSessionsTable";
import { DroidStatusPanel } from "@/components/dashboard/DroidStatusPanel";
import { ScheduleTimeline } from "@/components/dashboard/ScheduleTimeline";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { MOCK_SESSIONS } from "@/lib/api/schedules";
import { SIDEBAR_DROIDS } from "@/lib/api/droids";
import { useAuth } from "@/context/AuthContext";

const QUICK_ACTIONS = [
  { label: "Register Teacher", href: "/register/teacher", icon: UserPlus },
  { label: "Register Droid", href: "/register/droid", icon: Cpu },
  { label: "Add Students", href: "/register/students", icon: GraduationCap },
  { label: "New Class Group", href: "/register/class-group", icon: Plus },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [alertVisible, setAlertVisible] = useState(true);
  const firstName = user?.displayName?.split(" ")[0] ?? "Admin";
  const todaySessions = MOCK_SESSIONS.slice(0, 5);

  return (
    <div className="p-6 max-w-screen-xl">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Welcome back, {firstName}.</h2>
          <p className="text-sm text-muted mt-1">SMK Taman Melawati • Thursday, 12 March 2026</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm">Export Report</Button>
          <Button variant="secondary" size="sm">
            <Calendar size={15} />
            Create Schedule
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-medium text-text hover:bg-subtle hover:border-primary/30 transition-colors"
          >
            <Icon size={16} className="text-primary" />
            {label}
          </Link>
        ))}
      </div>

      {/* Hardware alert */}
      {alertVisible && (
        <div className="mb-6">
          <AlertBanner
            variant="warning"
            title="Hardware Alert"
            message="Droid EB-7811-C in Hall 1 has been offline for 15 minutes."
            onDismiss={() => setAlertVisible(false)}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Teachers" value="48" subtext="2 pending registration" />
        <StatCard icon={GraduationCap} label="Total Students" value="1,240" subtext="Across 42 class groups" />
        <StatCard icon={Cpu} label="Active Droids" value="38 / 40" subtext="2 droids currently offline" />
        <StatCard icon={Calendar} label="Sessions Today" value="156" subtext="+12% from last week" live />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <TeachingSessionsTable sessions={todaySessions} />
        </div>
        <div>
          <DroidStatusPanel droids={SIDEBAR_DROIDS} />
        </div>
      </div>

      {/* Schedule timeline */}
      <ScheduleTimeline />
    </div>
  );
}
