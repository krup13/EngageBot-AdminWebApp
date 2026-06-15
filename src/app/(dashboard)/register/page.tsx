import Link from "next/link";
import { Users, Building2, GraduationCap, Cpu, HelpCircle, ScrollText, X } from "lucide-react";

const HUB_CARDS = [
  {
    href: "/register/teacher",
    icon: Users,
    title: "Register Teacher",
    description: "Onboard new teaching staff, assign departments, and generate system IDs for app access.",
    color: "text-primary",
    bg: "bg-primary-light",
  },
  {
    href: "/register/class-group",
    icon: Building2,
    title: "Register Class Group",
    description: "Define academic year groups and room assignments for classroom monitoring.",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    href: "/register/students",
    icon: GraduationCap,
    title: "Register Student(s)",
    description: "Bulk import student rosters or manually register individual pupils for specific class groups.",
    color: "text-green-700",
    bg: "bg-green-50",
  },
  {
    href: "/register/droid",
    icon: Cpu,
    title: "Register Droid",
    description: "Sync new AI detection hardware with physical classroom locations and firmware tracking.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default function RegistrationHubPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mb-4">
          <Users size={26} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">Register New User</h2>
        <p className="text-sm text-muted max-w-md">
          Select the type of entity you would like to enroll into the EngageBot management system.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        {HUB_CARDS.map(({ href, icon: Icon, title, description, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="group bg-surface rounded-2xl border border-border p-7 flex flex-col items-center text-center gap-4 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className={`w-14 h-14 rounded-full ${bg} flex items-center justify-center`}>
              <Icon size={26} className={color} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-xs text-muted text-center">
          All new registrations undergo system validation to prevent duplicate IDs or resource conflicts.
        </p>
        <div className="flex gap-6">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
            <X size={14} />
            Cancel Registration
          </Link>
          <button className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
            <HelpCircle size={14} />
            Need help with registration?
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
            <ScrollText size={14} />
            View registration logs
          </button>
        </div>
      </div>
    </div>
  );
}
