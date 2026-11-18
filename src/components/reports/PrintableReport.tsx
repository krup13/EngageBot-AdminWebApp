// Print-only A4 documents for the Reports page. They are hidden on screen and replace the
// screen layout when the page is printed (see `print:` classes in reports/page.tsx).
// Every figure is computed from the session reports passed in; nothing here is sample data.

import type { SessionReport, StudentEngagement } from "@/lib/types";

// Paper is always white, so these colours are fixed rather than theme tokens.
const INK = "#1C1C1C";
const MUTED = "#5F6670";
const RULE = "#DAD6CE";
const PRIMARY = "#5C7A4E";
const LEVEL_COLOR = { high: "#16A34A", medium: "#D97706", low: "#C2622A" } as const;
const LEVEL_BG = { high: "#DCFCE7", medium: "#FEF3C7", low: "#FBE8E3" } as const;
const LEVEL_TEXT = { high: "#11753A", medium: "#9A5404", low: "#A04E1F" } as const;

type Level = keyof typeof LEVEL_COLOR;
const ATTENTION_BELOW = 50; // average focus below this flags a student

// Same thresholds the droid and the backend use.
function levelOf(score: number): Level {
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

// Faces the droid saw but could not match to an enrolled student (it names them "Unlabeled-…").
export const isUnrecognised = (e: StudentEngagement) => /^(unlabeled|unknown)\b/i.test(e.studentName ?? "");

// Title for the class filter: "All classes" names the class when every lesson is from one class.
function classTitle(label: string, sessions: SessionReport[]): string {
  const classes = [...new Set(sessions.map((s) => s.classGroup))];
  return label === "All classes" && classes.length === 1 ? classes[0] : label;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n: number) => Math.round(n);

function minutesBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const m = eh * 60 + em - (sh * 60 + sm);
  return Number.isFinite(m) && m >= 0 ? m : null;
}

function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function generatedLabel(): string {
  return new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Share of students at each level in one lesson.
function breakdownOf(students: StudentEngagement[]): Record<Level, number> {
  const counted = students.filter((s) => s.engagementLevel !== "absent");
  if (!counted.length) return { high: 0, medium: 0, low: 0 };
  const share = (l: Level) => round((counted.filter((s) => levelOf(s.focusScore) === l).length / counted.length) * 100);
  return { high: share("high"), medium: share("medium"), low: share("low") };
}

// Class focus across the lesson: every student's timeline averaged into equal time buckets.
function classCurve(session: SessionReport): { min: number; score: number }[] {
  const points = session.studentEngagements.flatMap((s) => s.timeline ?? []);
  if (points.length < 2) return [];
  const lastSec = Math.max(...points.map((p) => p.t));
  const bucketSec = Math.max(60, Math.ceil(lastSec / 24 / 60) * 60); // about 24 points, whole minutes
  const buckets = new Map<number, number[]>();
  for (const p of points) {
    const b = Math.floor(p.t / bucketSec);
    buckets.set(b, [...(buckets.get(b) ?? []), p.score]);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, scores]) => ({ min: round((b * bucketSec) / 60), score: round(avg(scores)) }));
}

function lowestPoint(curve: { min: number; score: number }[]): string {
  if (curve.length < 2) return "—";
  const low = curve.reduce((a, b) => (b.score < a.score ? b : a));
  return `min ${low.min} (${low.score}%)`;
}

// A student's timeline reduced to at most `n` evenly spaced averages, for a sparkline.
function trendOf(timeline: { t: number; score: number }[] | undefined, n = 10): number[] {
  if (!timeline || timeline.length < 2) return [];
  const size = Math.ceil(timeline.length / n);
  const out: number[] = [];
  for (let i = 0; i < timeline.length; i += size) out.push(round(avg(timeline.slice(i, i + size).map((p) => p.score))));
  return out;
}

const POSE: Record<string, string> = { forward: "Facing forward", down: "Looking down", side: "Turned slightly", away: "Turned away" };
const EXPRESSION: Record<string, string> = { attentive: "Attentive", neutral: "Neutral", drowsy: "Drowsy", yawning: "Yawning" };
const POSTURE: Record<string, string> = {
  hand_raised: "Hand raised", leaning_in: "Leaning in", neutral: "Upright", head_down: "Head down on desk", slouched: "Slouched",
};

function top(dist?: Record<string, number>): [string, number] | null {
  if (!dist) return null;
  const entries = Object.entries(dist).filter(([, v]) => typeof v === "number" && v > 0);
  return entries.length ? entries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
}

// The most telling behaviour: a pose away from the board first, then drowsiness, then posture.
function mostlyOf(dists: { pose?: Record<string, number>; expression?: Record<string, number>; posture?: Record<string, number> }): string {
  const pose = top(dists.pose);
  if (pose && pose[0] !== "forward") return `${POSE[pose[0]] ?? pose[0]} ${pose[1]}% of the time`;
  const expr = top(dists.expression);
  if (expr && (expr[0] === "drowsy" || expr[0] === "yawning")) return `${EXPRESSION[expr[0]]} ${expr[1]}% of the time`;
  const posture = top(dists.posture);
  if (posture && posture[0] !== "neutral") return POSTURE[posture[0]] ?? posture[0];
  if (expr) return EXPRESSION[expr[0]] ?? expr[0];
  return pose ? POSE[pose[0]] ?? pose[0] : "—";
}

// Average several percentage distributions key by key.
function mergeDists(dists: (Record<string, number> | undefined)[]): Record<string, number> | undefined {
  const present = dists.filter((d): d is Record<string, number> => !!d && Object.keys(d).length > 0);
  if (!present.length) return undefined;
  const keys = new Set(present.flatMap((d) => Object.keys(d)));
  return Object.fromEntries([...keys].map((k) => [k, round(avg(present.map((d) => d[k] ?? 0)))]));
}

// Per-student averages across several lessons.
type StudentSummary = { id: string; name: string; classGroup: string; lessons: number; focus: number; mostly: string; trend: number[] };

function summariseStudents(sessions: SessionReport[]): StudentSummary[] {
  const by = new Map<string, { name: string; classGroup: string; rows: { s: SessionReport; e: StudentEngagement }[] }>();
  for (const s of sessions) {
    for (const e of s.studentEngagements.filter((x) => !isUnrecognised(x))) {
      const key = e.studentId || `${s.classGroup}:${e.studentName}`;
      const entry = by.get(key) ?? { name: e.studentName, classGroup: s.classGroup, rows: [] };
      entry.rows.push({ s, e });
      by.set(key, entry);
    }
  }
  return [...by.entries()].map(([id, { name, classGroup, rows }]) => ({
    id,
    name,
    classGroup,
    lessons: rows.length,
    focus: round(avg(rows.map((r) => r.e.focusScore))),
    mostly: mostlyOf({
      pose: mergeDists(rows.map((r) => r.e.poseDistribution)),
      expression: mergeDists(rows.map((r) => r.e.expressionDistribution)),
      posture: mergeDists(rows.map((r) => r.e.postureDistribution)),
    }),
    trend: [...rows].sort((a, b) => (a.s.date + a.s.startTime).localeCompare(b.s.date + b.s.startTime)).map((r) => r.e.focusScore),
  }));
}

// ── Small building blocks ─────────────────────────────────────────────────────

function Pill({ score }: { score: number }) {
  const l = levelOf(score);
  return (
    <span className="inline-block rounded-full px-2 py-px text-[10px] font-semibold" style={{ background: LEVEL_BG[l], color: LEVEL_TEXT[l] }}>
      {score}%
    </span>
  );
}

function StackBar({ high, medium, low }: Record<Level, number>) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: "#ECE9E2" }} aria-label={`High ${high}%, medium ${medium}%, low ${low}%`}>
      <span style={{ width: `${high}%`, background: LEVEL_COLOR.high }} />
      <span style={{ width: `${medium}%`, background: LEVEL_COLOR.medium }} />
      <span style={{ width: `${low}%`, background: LEVEL_COLOR.low }} />
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span style={{ color: MUTED }}>—</span>;
  const w = 80, h = 20, lo = Math.min(...values) - 4, hi = Math.max(...values) + 4;
  const x = (i: number) => 2 + (i * (w - 4)) / (values.length - 1);
  const y = (v: number) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.2} fill={color} />
    </svg>
  );
}

// Line chart on a fixed 0–100% scale, with the lowest stretch shaded.
function LineChart({ xs, ys, xTitle, shadeLowest }: { xs: string[]; ys: number[]; xTitle?: string; shadeLowest?: boolean }) {
  const W = 560, H = 190, L = 38, R = 12, T = 12, B = xTitle ? 40 : 26;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(ys.length - 1, 1);
  const y = (v: number) => T + ((100 - v) / 100) * (H - T - B);
  const pts = ys.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const lowIdx = ys.indexOf(Math.min(...ys));
  const every = Math.max(1, Math.ceil(xs.length / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Focus over time">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#ECE9E2" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill={MUTED}>{v}%</text>
        </g>
      ))}
      {shadeLowest && ys.length > 2 && (
        <rect
          x={x(Math.max(lowIdx - 1, 0))}
          y={T}
          width={x(Math.min(lowIdx + 1, ys.length - 1)) - x(Math.max(lowIdx - 1, 0))}
          height={H - T - B}
          fill={LEVEL_COLOR.low}
          opacity={0.09}
        />
      )}
      <path d={`M${x(0)},${y(0)}L${pts.join("L")}L${x(ys.length - 1)},${y(0)}Z`} fill={PRIMARY} opacity={0.1} />
      <path d={`M${pts.join("L")}`} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinejoin="round" />
      {ys.length <= 8 && ys.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r={3.5} fill="#fff" stroke={PRIMARY} strokeWidth={2} />
          <text x={x(i)} y={y(v) - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill={INK}>{v}%</text>
        </g>
      ))}
      {xs.map((t, i) => (i % every === 0 || i === xs.length - 1) && (
        <text key={i} x={x(i)} y={H - B + 15} textAnchor={i === 0 ? "start" : i === xs.length - 1 ? "end" : "middle"} fontSize={10} fill={MUTED}>{t}</text>
      ))}
      {xTitle && <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize={10} fill={MUTED}>{xTitle}</text>}
    </svg>
  );
}

function Letterhead({ kind, title, subtitle, meta }: { kind: string; title: string; subtitle: string; meta: [string, string][] }) {
  return (
    <div className="flex justify-between gap-6 pb-4 mb-5" style={{ borderBottom: `3px solid ${PRIMARY}` }}>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.12em]" style={{ color: PRIMARY }}>ENGAGEBOT · {kind}</p>
        <h1 className="text-[22px] font-bold leading-tight mt-1.5 mb-1" style={{ color: INK }}>{title}</h1>
        <p className="text-[11px]" style={{ color: MUTED }}>{subtitle}</p>
      </div>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-[10.5px] self-start whitespace-nowrap">
        {meta.map(([k, v]) => (
          <div key={k} className="contents">
            <dt style={{ color: MUTED }}>{k}</dt>
            <dd className="font-medium" style={{ color: INK }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Tiles({ items }: { items: { k: string; v: string; d: string; alert?: boolean }[] }) {
  return (
    <div className="grid grid-cols-4 rounded-lg mb-5" style={{ border: `1px solid ${RULE}` }}>
      {items.map((t, i) => (
        <div key={t.k} className="px-3.5 py-2.5" style={i ? { borderLeft: `1px solid ${RULE}` } : undefined}>
          <p className="text-[9px] uppercase tracking-[0.08em] font-medium" style={{ color: MUTED }}>{t.k}</p>
          <p className="text-[20px] font-semibold leading-tight mt-0.5" style={{ color: t.alert ? LEVEL_COLOR.low : INK }}>{t.v}</p>
          <p className="text-[10px]" style={{ color: MUTED }}>{t.d}</p>
        </div>
      ))}
    </div>
  );
}

function Section({ title, hint, children, breakBefore }: { title: string; hint?: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section className="mb-5" style={{ breakBefore: breakBefore ? "page" : undefined, breakInside: "avoid-page" }}>
      <h2 className="text-[13px] font-semibold" style={{ color: INK }}>{title}</h2>
      {hint && <p className="text-[10px] mb-2" style={{ color: MUTED }}>{hint}</p>}
      {children}
    </section>
  );
}

function Table({ head, rows, numeric = [] }: { head: string[]; rows: React.ReactNode[][]; numeric?: number[] }) {
  return (
    <table className="w-full border-collapse text-[10.5px]" style={{ color: INK }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={h + i}
              className={`px-2 py-1.5 text-[9px] uppercase tracking-[0.06em] font-medium ${numeric.includes(i) ? "text-right" : "text-left"}`}
              style={{ color: MUTED, background: "#F6F4EF" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} style={{ breakInside: "avoid" }}>
            {r.map((c, ci) => (
              <td key={ci} className={`px-2 py-1.5 align-middle ${numeric.includes(ci) ? "text-right whitespace-nowrap" : ""}`} style={{ borderTop: `1px solid ${RULE}` }}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Notes({ items }: { items: [string, string][] }) {
  return (
    <div className="rounded-lg px-4 py-3 text-[10px] flex flex-col gap-1 mb-6" style={{ background: "#F6F4EF", color: INK, breakInside: "avoid" }}>
      {items.map(([k, v]) => (
        <p key={k}><strong className="font-semibold">{k}.</strong> {v}</p>
      ))}
    </div>
  );
}

function Signatures({ labels }: { labels: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-12 mt-10 text-[10px]" style={{ color: MUTED, breakInside: "avoid" }}>
      {labels.map((l) => (
        <div key={l} className="pt-1.5" style={{ borderTop: `1px solid ${INK}` }}>{l}</div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex gap-4 text-[9.5px] mt-1.5" style={{ color: MUTED }}>
      {(["high", "medium", "low"] as Level[]).map((l) => (
        <span key={l} className="flex items-center gap-1">
          <i className="inline-block w-2 h-2 rounded-sm" style={{ background: LEVEL_COLOR[l] }} />
          {l === "high" ? "High (65%+)" : l === "medium" ? "Medium (35–64%)" : "Low (under 35%)"}
        </span>
      ))}
    </div>
  );
}

const READING_NOTES: [string, string][] = [
  ["How focus is measured", "The classroom droid estimates each student's focus every 5 seconds from head pose, eye and mouth openness, and upper-body posture."],
  ["Privacy", "No images or video are stored. Only these measurements are kept."],
];

function Doc({ children }: { children: React.ReactNode }) {
  return <div className="print-doc text-[11px] leading-snug bg-white" style={{ color: INK }}>{children}</div>;
}

// ── Daily report ──────────────────────────────────────────────────────────────

export function DailyPrintReport({
  date, classLabel, sessions, school,
}: { date: string; classLabel: string; sessions: SessionReport[]; school?: string }) {
  const ordered = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const students = summariseStudents(ordered);
  const attention = students.filter((s) => s.focus < ATTENTION_BELOW).sort((a, b) => a.focus - b.focus);
  const studentLessons = ordered.flatMap((s) => s.studentEngagements);
  const lowestLesson = ordered.length ? ordered.reduce((a, b) => (b.avgFocusScore < a.avgFocusScore ? b : a)) : null;
  const droids = [...new Set(ordered.map((s) => s.droidId).filter(Boolean))].join(", ") || "—";
  const multiClass = new Set(ordered.map((s) => s.classGroup)).size > 1;
  const unrecognised = ordered.flatMap((s) => s.studentEngagements).filter(isUnrecognised).length;

  return (
    <Doc>
      <Letterhead
        kind="DAILY ENGAGEMENT REPORT"
        title={`${classTitle(classLabel, ordered)} · ${longDate(date)}`}
        subtitle={school || "EngageBot"}
        meta={[
          ["Lessons", `${ordered.length} recorded`],
          ["Students", `${students.length} recognised${unrecognised ? ` + ${unrecognised} unrecognised` : ""}`],
          ["Droid", droids],
          ["Generated", generatedLabel()],
        ]}
      />

      {ordered.length === 0 ? (
        <p className="py-10 text-center" style={{ color: MUTED }}>No lessons were recorded on this date.</p>
      ) : (
        <>
          <Tiles
            items={[
              { k: "Average focus", v: `${round(avg(ordered.map((s) => s.avgFocusScore)))}%`, d: "across today's lessons" },
              {
                k: "Highly engaged",
                v: `${studentLessons.length ? round((studentLessons.filter((e) => levelOf(e.focusScore) === "high").length / studentLessons.length) * 100) : 0}%`,
                d: "of student-lessons",
              },
              { k: "Lowest lesson", v: lowestLesson?.subject ?? "—", d: lowestLesson ? `${lowestLesson.avgFocusScore}%, ${lowestLesson.startTime}` : "" },
              { k: "Need attention", v: String(attention.length), d: `students below ${ATTENTION_BELOW}%`, alert: attention.length > 0 },
            ]}
          />

          <Section title="Lessons today" hint="Each lesson follows on its own page with the full student list.">
            <Table
              head={["Time", "Subject", ...(multiClass ? ["Class"] : []), "Teacher", "Focus", "Breakdown", "Lowest point", "Recognised"]}
              numeric={[multiClass ? 4 : 3, multiClass ? 7 : 6]}
              rows={ordered.map((s) => [
                <span key="t" className="whitespace-nowrap" style={{ color: MUTED }}>{s.startTime}–{s.endTime || "…"}</span>,
                s.subject,
                ...(multiClass ? [s.classGroup] : []),
                <span key="te" style={{ color: MUTED }}>{s.teacherName}</span>,
                <Pill key="p" score={s.avgFocusScore} />,
                <div key="b" className="w-28"><StackBar {...breakdownOf(s.studentEngagements)} /></div>,
                <span key="l" className="whitespace-nowrap" style={{ color: MUTED }}>{lowestPoint(classCurve(s))}</span>,
                s.studentEngagements.filter((e) => !isUnrecognised(e)).length,
              ])}
            />
            <Legend />
          </Section>

          {attention.length > 0 && (
            <Section title="Students who need attention" hint={`Average focus below ${ATTENTION_BELOW}% across today's lessons.`}>
              <Table
                head={["Student", ...(multiClass ? ["Class"] : []), "Lessons", "Focus", "Most of the time"]}
                numeric={[multiClass ? 2 : 1, multiClass ? 3 : 2]}
                rows={attention.map((s) => [
                  <span key="n" className="font-medium">{s.name}</span>,
                  ...(multiClass ? [s.classGroup] : []),
                  s.lessons,
                  <Pill key="p" score={s.focus} />,
                  <span key="m" style={{ color: MUTED }}>{s.mostly}</span>,
                ])}
              />
            </Section>
          )}

          {ordered.some((s) => s.noiseDistribution && Object.keys(s.noiseDistribution).length) && (
            <Section title="Classroom noise" hint="Measured by the droid's microphone. Volume only; no speech is recorded.">
              <Table
                head={["Lesson", "Quiet", "Moderate", "Loud"]}
                numeric={[1, 2, 3]}
                rows={ordered.filter((s) => s.noiseDistribution).map((s) => [
                  `${s.startTime} ${s.subject}`,
                  `${s.noiseDistribution?.quiet ?? 0}%`,
                  `${s.noiseDistribution?.moderate ?? 0}%`,
                  `${s.noiseDistribution?.loud ?? 0}%`,
                ])}
              />
            </Section>
          )}

          {ordered.map((s) => <LessonPage key={s.id} session={s} />)}

          <Notes items={READING_NOTES} />
          <Signatures labels={["Form teacher", "Date reviewed"]} />
        </>
      )}
    </Doc>
  );
}

function LessonPage({ session }: { session: SessionReport }) {
  const curve = classCurve(session);
  const br = breakdownOf(session.studentEngagements);
  const rows = session.studentEngagements.filter((e) => !isUnrecognised(e)).sort((a, b) => a.focusScore - b.focusScore);
  const unknown = session.studentEngagements.filter(isUnrecognised);
  const minutes = minutesBetween(session.startTime, session.endTime);

  return (
    <section style={{ breakBefore: "page" }}>
      <div className="flex justify-between items-end gap-6 pb-2.5 mb-4" style={{ borderBottom: `1px solid ${RULE}` }}>
        <div>
          <p className="text-[10.5px]" style={{ color: MUTED }}>
            {session.classGroup} · {session.startTime}–{session.endTime || "in progress"}{minutes !== null ? ` (${minutes} min)` : ""} · {session.teacherName} · {session.droidId}
          </p>
          <p className="text-[18px] font-semibold leading-tight" style={{ color: INK }}>{session.subject}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.08em]" style={{ color: MUTED }}>Class focus</p>
          <p className="text-[20px] font-semibold leading-tight">{session.avgFocusScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-6 mb-4" style={{ breakInside: "avoid" }}>
        <div>
          <h2 className="text-[13px] font-semibold">Focus during this lesson</h2>
          <p className="text-[10px] mb-1" style={{ color: MUTED }}>Class average. The shaded band is the lowest stretch.</p>
          {curve.length >= 2
            ? <LineChart xs={curve.map((p) => String(p.min))} ys={curve.map((p) => p.score)} xTitle="Minutes into the lesson" shadeLowest />
            : <p className="py-6 text-[10.5px]" style={{ color: MUTED }}>Not enough timeline data for a chart.</p>}
        </div>
        <div>
          <h2 className="text-[13px] font-semibold">Engagement breakdown</h2>
          <p className="text-[10px] mb-2" style={{ color: MUTED }}>Share of students at each level.</p>
          <div className="flex flex-col gap-2">
            {(["high", "medium", "low"] as Level[]).map((l) => (
              <div key={l} className="grid grid-cols-[4.5em_1fr_2.5em] items-center gap-2 text-[10.5px]">
                <span className="capitalize">{l}</span>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#ECE9E2" }}>
                  <div className="h-full" style={{ width: `${br[l]}%`, background: LEVEL_COLOR[l] }} />
                </div>
                <span className="text-right font-semibold">{br[l]}%</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: MUTED }}>
            Lowest point: <strong style={{ color: INK }}>{lowestPoint(curve)}</strong>
            {session.noiseDistribution?.loud !== undefined ? ` · Loud for ${session.noiseDistribution.loud}% of the lesson` : ""}
          </p>
        </div>
      </div>

      <h2 className="text-[13px] font-semibold">Students</h2>
      <p className="text-[10px] mb-2" style={{ color: MUTED }}>Sorted by focus, lowest first. Trend shows focus across the lesson.</p>
      {unknown.length > 0 && (
        <p className="text-[10px] mb-2" style={{ color: MUTED }}>
          The droid also saw {unknown.length} face{unknown.length === 1 ? "" : "s"} it could not match to an enrolled student
          (average focus {round(avg(unknown.map((e) => e.focusScore)))}%). They count towards the class figures above but are not listed.
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-[10.5px]" style={{ color: MUTED }}>No enrolled students were recognised in this lesson.</p>
      ) : (
        <Table
          head={["Student", "Level", "Focus", "Trend", "Most of the time", "Distracted"]}
          numeric={[2, 5]}
          rows={rows.map((e) => {
            const l = levelOf(e.focusScore);
            return [
              <span key="n" className="font-medium">{e.studentName}</span>,
              <span key="l" className="rounded-full px-2 py-px text-[10px] font-medium capitalize" style={{ background: LEVEL_BG[l], color: LEVEL_TEXT[l] }}>{l}</span>,
              `${e.focusScore}%`,
              <Sparkline key="s" values={trendOf(e.timeline)} color={LEVEL_COLOR[l]} />,
              <span key="m" style={{ color: MUTED }}>{mostlyOf({ pose: e.poseDistribution, expression: e.expressionDistribution, posture: e.postureDistribution })}</span>,
              `${e.distractedCount}×`,
            ];
          })}
        />
      )}
    </section>
  );
}

// ── Monthly report ────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function MonthlyPrintReport({
  monthLabel, classLabel, sessions, school,
}: { monthLabel: string; classLabel: string; sessions: SessionReport[]; school?: string }) {
  const ordered = [...sessions].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const students = summariseStudents(ordered);
  const attention = students.filter((s) => s.lessons >= 3 && s.focus < ATTENTION_BELOW).sort((a, b) => a.focus - b.focus);
  const completed = ordered.filter((s) => s.status === "completed").length;
  const unrecognised = ordered.flatMap((s) => s.studentEngagements).filter(isUnrecognised).length;

  const groupBy = (key: (s: SessionReport) => string) => {
    const m = new Map<string, SessionReport[]>();
    for (const s of ordered) m.set(key(s), [...(m.get(key(s)) ?? []), s]);
    return m;
  };
  const summarise = (m: Map<string, SessionReport[]>) =>
    [...m.entries()].map(([name, list]) => ({
      name,
      lessons: list.length,
      focus: round(avg(list.map((s) => s.avgFocusScore))),
      breakdown: breakdownOf(list.flatMap((s) => s.studentEngagements)),
    }));
  const classes = summarise(groupBy((s) => s.classGroup)).sort((a, b) => b.focus - a.focus);
  const subjects = summarise(groupBy((s) => s.subject)).sort((a, b) => b.focus - a.focus);

  // Week of the month: days 1–7 are week 1, and so on.
  const weeks = [...groupBy((s) => String(Math.ceil(Number(s.date.slice(8, 10)) / 7))).entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([w, list]) => ({ label: `Week ${w}`, focus: round(avg(list.map((s) => s.avgFocusScore))), lessons: list.length }));

  // Average focus by lesson start hour and weekday.
  const hours = [...new Set(ordered.map((s) => s.startTime.slice(0, 2)))].sort();
  const cell = (hour: string, weekday: number) => {
    const list = ordered.filter((s) => s.startTime.startsWith(hour) && new Date(`${s.date}T00:00:00`).getDay() === weekday + 1);
    return list.length ? round(avg(list.map((s) => s.avgFocusScore))) : null;
  };

  const allRows = ordered.flatMap((s) => s.studentEngagements);
  const behaviour: [string, Record<string, number> | undefined, Record<string, string>][] = [
    ["Where students were looking", mergeDists(allRows.map((e) => e.poseDistribution)), POSE],
    ["Expression", mergeDists(allRows.map((e) => e.expressionDistribution)), EXPRESSION],
    ["Posture", mergeDists(allRows.map((e) => e.postureDistribution)), POSTURE],
  ];
  const fewLessons = classes.filter((c) => c.lessons < 10).map((c) => c.name);

  return (
    <Doc>
      <Letterhead
        kind="MONTHLY ENGAGEMENT REPORT"
        title={`${monthLabel} · ${classTitle(classLabel, ordered)}`}
        subtitle={school ? `${school} · Prepared for the school administration` : "Prepared for the school administration"}
        meta={[
          ["Classes", String(classes.length)],
          ["Lessons", `${completed} of ${ordered.length} completed`],
          ["Students", `${students.length} recognised`],
          ["Generated", generatedLabel()],
        ]}
      />

      {ordered.length === 0 ? (
        <p className="py-10 text-center" style={{ color: MUTED }}>No lessons were recorded in this month.</p>
      ) : (
        <>
          <Tiles
            items={[
              { k: "Average focus", v: `${round(avg(ordered.map((s) => s.avgFocusScore)))}%`, d: `across ${ordered.length} lessons` },
              classes.length > 1
                ? { k: "Top class", v: classes[0].name, d: `${classes[0].focus}% average` }
                : { k: "Completed", v: `${completed}/${ordered.length}`, d: "lessons this month" },
              { k: "Lowest subject", v: subjects[subjects.length - 1]?.name ?? "—", d: subjects.length ? `${subjects[subjects.length - 1].focus}%, ${subjects[subjects.length - 1].lessons} lessons` : "" },
              { k: "Need attention", v: String(attention.length), d: `below ${ATTENTION_BELOW}% over 3+ lessons`, alert: attention.length > 0 },
            ]}
          />

          <div className="grid grid-cols-[1.3fr_1fr] gap-6 mb-5" style={{ breakInside: "avoid" }}>
            <div>
              <h2 className="text-[13px] font-semibold">Focus week by week</h2>
              <p className="text-[10px] mb-1" style={{ color: MUTED }}>Average focus of the lessons recorded each week.</p>
              {weeks.length >= 2
                ? <LineChart xs={weeks.map((w) => w.label)} ys={weeks.map((w) => w.focus)} />
                : <p className="py-6 text-[10.5px]" style={{ color: MUTED }}>{weeks[0] ? `${weeks[0].label}: ${weeks[0].focus}% (${weeks[0].lessons} lessons). More weeks are needed for a trend.` : "—"}</p>}
            </div>
            <div>
              <h2 className="text-[13px] font-semibold">Focus by time of day</h2>
              <p className="text-[10px] mb-2" style={{ color: MUTED }}>Average per lesson start hour. A dash means no lessons.</p>
              <div className="grid grid-cols-[3.2em_repeat(5,1fr)] gap-1 text-[10px]">
                <span />
                {WEEKDAYS.map((d) => <span key={d} className="text-center" style={{ color: MUTED }}>{d}</span>)}
                {hours.map((h) => (
                  <div key={h} className="contents">
                    <span style={{ color: MUTED }}>{h}:00</span>
                    {WEEKDAYS.map((d, i) => {
                      const v = cell(h, i);
                      return (
                        <span
                          key={d}
                          className="text-center rounded py-1 font-semibold"
                          style={v === null ? { background: "#F6F4EF", color: MUTED, fontWeight: 400 } : { background: LEVEL_BG[levelOf(v)], color: LEVEL_TEXT[levelOf(v)] }}
                        >
                          {v === null ? "–" : v}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Section title="Classes compared" hint={fewLessons.length ? `* Fewer than 10 lessons recorded, so read with care.` : undefined}>
            <Table
              head={["Class", "Lessons", "Focus", "Breakdown"]}
              numeric={[1, 2]}
              rows={classes.map((c) => [
                <span key="n" className="font-medium">{c.name}</span>,
                `${c.lessons}${c.lessons < 10 ? "*" : ""}`,
                <Pill key="p" score={c.focus} />,
                <div key="b" className="w-40"><StackBar {...c.breakdown} /></div>,
              ])}
            />
            <Legend />
          </Section>

          <Section title="Subjects compared" hint="Average focus, with the number of lessons behind each figure.">
            <div className="flex flex-col gap-1.5">
              {subjects.map((s) => (
                <div key={s.name} className="grid grid-cols-[9em_1fr_3em_5em] items-center gap-2 text-[10.5px]">
                  <span className="text-right">{s.name}</span>
                  <div className="h-3 rounded overflow-hidden" style={{ background: "#ECE9E2" }}>
                    <div className="h-full rounded" style={{ width: `${s.focus}%`, background: LEVEL_COLOR[levelOf(s.focus)] }} />
                  </div>
                  <span className="font-semibold text-right">{s.focus}%</span>
                  <span style={{ color: MUTED }}>{s.lessons} lesson{s.lessons === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          </Section>

          {behaviour.some(([, d]) => d) && (
            <Section title="What students were doing" hint="Average share of observed time across all recorded students.">
              <div className="flex flex-col gap-2.5">
                {behaviour.filter(([, d]) => d).map(([label, dist, names]) => (
                  <div key={label}>
                    <p className="text-[10.5px] font-medium mb-1">{label}</p>
                    <p className="text-[10.5px]" style={{ color: MUTED }}>
                      {Object.entries(dist!).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${names[k] ?? k} ${v}%`).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Students who need attention" hint={`Average focus below ${ATTENTION_BELOW}% across at least 3 lessons this month.`} breakBefore>
            {attention.length === 0 ? (
              <p className="text-[10.5px]" style={{ color: MUTED }}>No student was below {ATTENTION_BELOW}% across 3 or more lessons.</p>
            ) : (
              <Table
                head={["Student", "Class", "Lessons", "Focus", "Trend", "Most of the time"]}
                numeric={[2, 3]}
                rows={attention.map((s) => [
                  <span key="n" className="font-medium">{s.name}</span>,
                  <span key="c" style={{ color: MUTED }}>{s.classGroup}</span>,
                  s.lessons,
                  <Pill key="p" score={s.focus} />,
                  <Sparkline key="t" values={s.trend} color={LEVEL_COLOR.low} />,
                  <span key="m" style={{ color: MUTED }}>{s.mostly}</span>,
                ])}
              />
            )}
          </Section>

          <Section title="Lesson log">
            <Table
              head={["Date", "Time", "Subject", "Class", "Teacher", "Focus", "Status"]}
              numeric={[5]}
              rows={ordered.map((s) => [
                <span key="d" className="whitespace-nowrap">{s.date}</span>,
                <span key="t" className="whitespace-nowrap" style={{ color: MUTED }}>{s.startTime}–{s.endTime || "…"}</span>,
                s.subject,
                s.classGroup,
                <span key="te" style={{ color: MUTED }}>{s.teacherName}</span>,
                <Pill key="p" score={s.avgFocusScore} />,
                s.status === "completed" ? "Completed" : "In progress",
              ])}
            />
          </Section>

          <Notes items={[...READING_NOTES, ["Coverage", `${ordered.length} lessons from ${classes.length} class${classes.length === 1 ? "" : "es"} were recorded this month.${fewLessons.length ? ` ${fewLessons.join(", ")} had fewer than 10 lessons.` : ""}${unrecognised ? ` The droid also recorded ${unrecognised} face${unrecognised === 1 ? "" : "s"} it could not match to an enrolled student; they count towards class figures only.` : ""}`]]} />
          <Signatures labels={["Prepared by (admin)", "Reviewed by (principal)"]} />
        </>
      )}
    </Doc>
  );
}
