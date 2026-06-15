"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, GraduationCap, Cpu, Calendar, UserPlus, Plus } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { TeachingSessionsTable } from "@/components/dashboard/TeachingSessionsTable";
import { DroidStatusPanel } from "@/components/dashboard/DroidStatusPanel";
import { ScheduleTimeline } from "@/components/dashboard/ScheduleTimeline";
import { LateAlertCarousel } from "@/components/dashboard/LateAlertCarousel";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { getSessions } from "@/lib/api/schedules";
import { getDroids } from "@/lib/api/droids";
import { getTeachers } from "@/lib/api/teachers";
import { getStudents } from "@/lib/api/students";
import { dayOf } from "@/lib/schedule-utils";
import type { ClassSession, Droid, Teacher, Student } from "@/lib/types";
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

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [droids, setDroids] = useState<Droid[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  useEffect(() => {
    getTeachers().then(setTeachers);
    getStudents().then(setStudents);
    getDroids().then(setDroids);
    getSessions().then(setSessions);
  }, []);

  const today = dayOf(new Date());
  const todayFiltered = today ? sessions.filter((s) => s.day === today) : sessions;
  // Fall back to all sessions if today's weekday has none, so the dashboard never looks empty.
  const todaySessions = (todayFiltered.length ? todayFiltered : sessions).slice(0, 6);
  const activeDroids = droids.filter((d) => d.status === "active").length;
  const offlineDroids = droids.filter((d) => d.status === "offline").length;

  // Hardware alert from real fleet data: first offline droid, else first low-battery one.
  const attentionDroid = droids.find((d) => d.status === "offline") ?? droids.find((d) => d.battery < 20);
  const hardwareMsg = attentionDroid
    ? attentionDroid.status === "offline"
      ? `Droid ${attentionDroid.droidId} (${attentionDroid.serialNumber}) in ${attentionDroid.assignedRoom} is offline — last ping ${attentionDroid.lastPing}.`
      : `Droid ${attentionDroid.droidId} in ${attentionDroid.assignedRoom} is low on battery (${attentionDroid.battery}%).`
    : "";
  const classGroupCount = new Set(students.map((s) => s.classGroup)).size;
  const pendingTeachers = teachers.filter((t) => t.status === "pending").length;

  // Sidebar droid panel shape
  const sidebarDroids = droids.slice(0, 5).map((d) => ({
    id: d.droidId,
    serial: d.serialNumber,
    room: d.assignedRoom,
    battery: d.battery,
    status: d.status,
  }));

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
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-text hover:bg-subtle hover:border-primary/30 transition-colors"
          >
            <Icon size={16} className="text-primary" />
            {label}
          </Link>
        ))}
      </div>

      {/* Alerts: teacher-late carousel (real-time) + hardware alert */}
      <div className="flex flex-col gap-3 mb-6">
        <LateAlertCarousel />
        {alertVisible && attentionDroid && (
          <AlertBanner
            variant="warning"
            title="Hardware Alert"
            message={hardwareMsg}
            onDismiss={() => setAlertVisible(false)}
            actions={
              <Link
                href="/droids"
                className="text-xs font-semibold text-warning bg-warning-bg border border-warning-border px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors whitespace-nowrap"
              >
                View Fleet
              </Link>
            }
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Teachers" value={String(teachers.length)} subtext={`${pendingTeachers} pending registration`} />
        <StatCard icon={GraduationCap} label="Total Students" value={String(students.length)} subtext={`Across ${classGroupCount} class group${classGroupCount === 1 ? "" : "s"}`} />
        <StatCard icon={Cpu} label="Active Droids" value={`${activeDroids} / ${droids.length}`} subtext={`${offlineDroids} droid${offlineDroids === 1 ? "" : "s"} currently offline`} />
        <StatCard icon={Calendar} label="Sessions Today" value={String(todaySessions.length)} subtext="Scheduled for today" live />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <TeachingSessionsTable sessions={todaySessions} />
        </div>
        <div>
          <DroidStatusPanel droids={sidebarDroids} />
        </div>
      </div>

      {/* Schedule timeline */}
      <ScheduleTimeline />
    </div>
  );
}
