"use client";

import { useState } from "react";
import { Cpu, Sun, Moon, Monitor, Check, Globe, Database } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { TabToggle } from "@/components/ui/TabToggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { isFirebaseConfigured } from "@/lib/firebase";
import { seedDatabase } from "@/lib/api/seed";

type ThemeOption = "light" | "dark" | "system";

// Hardcoded preview palette — intentionally not using CSS vars so previews
// always show the correct colour regardless of the active theme
const LIGHT  = { bg: "#F5F0EA", surface: "#FFFFFF", text: "#C8D0C0", muted: "#E5E7EB" };
const DARK   = { bg: "#191D14", surface: "#232819", text: "#4A5540", muted: "#353D2A" };
const SIDEBAR = "#6B7B5C";

function MiniPreview({ themeValue }: { themeValue: ThemeOption }) {
  const isSystem = themeValue === "system";
  const pal = themeValue === "dark" ? DARK : LIGHT;

  return (
    <div className="h-20 relative overflow-hidden">
      {isSystem ? (
        <div className="absolute inset-0 flex">
          <div className="flex-1" style={{ background: LIGHT.bg }} />
          <div className="flex-1" style={{ background: DARK.bg }} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: pal.bg }} />
      )}

      {/* Sidebar strip */}
      <div className="absolute inset-y-0 left-0 w-7" style={{ background: SIDEBAR }} />

      {isSystem ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Monitor size={22} className="text-white drop-shadow" />
        </div>
      ) : (
        <div
          className="absolute top-2 left-9 right-2 bottom-2 rounded-md p-2"
          style={{ background: pal.surface }}
        >
          <div className="h-1.5 w-3/4 rounded mb-1.5" style={{ background: pal.text }} />
          <div className="h-1 w-1/2 rounded mb-2" style={{ background: pal.muted }} />
          <div className="h-4 w-full rounded" style={{ background: pal.muted, opacity: 0.5 }} />
        </div>
      )}
    </div>
  );
}

const THEME_OPTIONS: { value: ThemeOption; label: string; Icon: React.ElementType }[] = [
  { value: "light",  label: "Light",  Icon: Sun },
  { value: "dark",   label: "Dark",   Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 flex flex-col gap-5">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, language, setLanguage } = useTheme();
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [seedOk, setSeedOk] = useState(true);
  const live = isFirebaseConfigured();

  async function handleSeed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await seedDatabase();
      const total = res.reduce((s, r) => s + r.count, 0);
      setSeedOk(true);
      setSeedMsg(`Seeded ${total} records — ${res.map((r) => `${r.count} ${r.collection}`).join(", ")}.`);
    } catch (e) {
      setSeedOk(false);
      setSeedMsg((e as Error).message || "Seeding failed. Make sure you're signed in as an admin.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-8 max-w-2xl">

      {/* ── Appearance ──────────────────────────────────────────────────────── */}
      <SettingsSection title="Appearance">
        <SettingsCard>
          <div>
            <p className="text-sm font-semibold text-text mb-0.5">Theme</p>
            <p className="text-xs text-muted">Choose how the EngageBot portal looks to you.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`relative rounded-xl border-2 overflow-hidden text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active ? "border-primary shadow-sm" : "border-border hover:border-muted"
                  }`}
                >
                  <MiniPreview themeValue={value} />

                  <div
                    className={`flex items-center gap-2 px-3 py-2 ${
                      active ? "bg-primary-light" : "bg-subtle"
                    }`}
                  >
                    <Icon size={13} className={active ? "text-primary" : "text-muted"} />
                    <span
                      className={`text-xs font-medium flex-1 ${
                        active ? "text-primary" : "text-muted"
                      }`}
                    >
                      {label}
                    </span>
                    {active && <Check size={12} className="text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── Language & Region ───────────────────────────────────────────────── */}
      <SettingsSection title="Language & Region">
        <SettingsCard>
          <div>
            <p className="text-sm font-semibold text-text mb-0.5">Interface Language</p>
            <p className="text-xs text-muted mb-4">Select your preferred display language.</p>
            <TabToggle
              tabs={[
                { label: "English", value: "en" },
                { label: "Bahasa Malaysia", value: "ms" },
              ]}
              active={language}
              onChange={(v) => setLanguage(v as "en" | "ms")}
            />
            <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
              <Globe size={12} className="shrink-0" />
              Full Bahasa Malaysia translation is coming in a future update.
            </p>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── Developer ───────────────────────────────────────────────────────── */}
      <SettingsSection title="Developer">
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
              <Database size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text mb-0.5">Seed sample data</p>
              <p className="text-xs text-muted">
                Push the built-in sample teachers, students, droids, class groups and schedules into
                your live Firestore database. Re-running overwrites the same records (no duplicates).
              </p>
            </div>
          </div>

          {!live && (
            <p className="text-xs text-warning">
              Connect Firebase first — set real credentials and <code>NEXT_PUBLIC_DEV_BYPASS=false</code> in
              <code> .env.local</code>, then restart the dev server.
            </p>
          )}

          {seedMsg && (
            <p className={`text-xs ${seedOk ? "text-success" : "text-error"}`}>{seedMsg}</p>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSeed} loading={seeding} disabled={!live}>
              <Database size={14} />
              Seed sample data
            </Button>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <SettingsSection title="About">
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <Cpu size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-sm font-semibold text-text">EngageBot Admin Portal</h3>
                <Badge label="v1.0.0-beta" variant="neutral" />
              </div>
              <p className="text-xs text-muted mb-2">
                Advanced Classroom Engagement Intelligence for Malaysian Secondary Schools
              </p>
              <p className="text-xs text-muted">© 2026 EngageBot Malaysia. All Rights Reserved.</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <button className="text-xs text-muted hover:text-text transition-colors">
              Security Policy
            </button>
            <button className="text-xs text-muted hover:text-text transition-colors">
              Privacy Notice
            </button>
            <button className="text-xs text-muted hover:text-text transition-colors">
              Usage Guidelines
            </button>
          </div>
        </SettingsCard>
      </SettingsSection>

    </div>
  );
}
