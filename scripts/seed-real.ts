/**
 * Load REAL data from data/*.csv directly into live Firestore.
 *
 * Uses the Firebase Admin SDK (service-account auth) so it bypasses security
 * rules — no browser, no sign-in. Each row is written at its `id` as the
 * document id, so re-running overwrites the same docs (idempotent, no dupes).
 *
 *   npm run seed
 *
 * Requires ./serviceAccountKey.json at the repo root (git-ignored).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type {
  Teacher,
  Student,
  ClassGroup,
  Droid,
  ClassSession,
} from "../src/lib/types";

type Row = Record<string, string>;
type Mapped = { id: string; data: Record<string, unknown> };

const ROOT = process.cwd();
const today = () => new Date().toISOString().slice(0, 10);
const s = (v: string | undefined) => (v ?? "").trim();
const isValidIC = (ic: string) => ic.replace(/\D/g, "").length === 12;

/** A collection's CSV file, target name, and row → document mapper. */
interface Spec {
  name: string;
  file: string;
  /** Return the document, or a string describing why the row is invalid. */
  map: (row: Row) => Mapped | string;
}

const SPECS: Spec[] = [
  {
    name: "teachers",
    file: "teachers.csv",
    map: (r) => {
      const id = s(r.id);
      if (!id) return "missing id";
      if (!s(r.name)) return "missing name";
      if (!s(r.email)) return "missing email";
      const data: Teacher = {
        id,
        name: s(r.name),
        email: s(r.email),
        department: s(r.department),
        assignedClasses: s(r.assignedClasses)
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean),
        status: (s(r.status) || "active") as Teacher["status"],
        employeeId: s(r.employeeId),
        dateAdded: s(r.dateAdded) || today(),
        authUid: null,
      };
      return { id, data: { ...data, id: undefined } };
    },
  },
  {
    name: "students",
    file: "students.csv",
    map: (r) => {
      if (!s(r.name)) return "missing name";
      if (!s(r.icNumber)) return "missing icNumber";
      if (!s(r.classGroup)) return "missing classGroup";
      const id = s(r.id) || s(r.studentId);
      if (!id) return "missing id and studentId (need at least one)";
      const data: Student = {
        id,
        name: s(r.name),
        icNumber: s(r.icNumber),
        classGroup: s(r.classGroup),
        studentId: s(r.studentId),
        source: "csv",
        status:
          (s(r.status) as Student["status"]) ||
          (isValidIC(s(r.icNumber)) ? "verified" : "pending"),
      };
      return { id, data: { ...data, id: undefined } };
    },
  },
  {
    name: "classGroups",
    file: "classGroups.csv",
    map: (r) => {
      if (!s(r.name)) return "missing name";
      const id = s(r.id) || s(r.name);
      const year = Number(s(r.academicYear));
      const data: ClassGroup = {
        id,
        name: s(r.name),
        academicYear: Number.isFinite(year) && year > 0 ? year : new Date().getFullYear(),
        room: s(r.room),
        droidId: s(r.droidId) || undefined,
      };
      return { id, data: { ...data, id: undefined } };
    },
  },
  {
    name: "droids",
    file: "droids.csv",
    map: (r) => {
      if (!s(r.droidId)) return "missing droidId";
      if (!s(r.serialNumber)) return "missing serialNumber";
      const id = s(r.id) || s(r.droidId);
      const battery = Number(s(r.battery));
      const data: Droid = {
        id,
        droidId: s(r.droidId),
        serialNumber: s(r.serialNumber),
        assignedRoom: s(r.assignedRoom),
        firmware: s(r.firmware),
        battery: Number.isFinite(battery) ? battery : 100,
        lastPing: s(r.lastPing) || "never",
        status: (s(r.status) || "active") as Droid["status"],
        telemetryNotes: s(r.telemetryNotes) || undefined,
      };
      return { id, data: { ...data, id: undefined } };
    },
  },
  {
    name: "classSchedules",
    file: "classSchedules.csv",
    map: (r) => {
      const id = s(r.id);
      if (!id) return "missing id";
      for (const f of ["subject", "teacherId", "teacherName", "classGroup", "startTime", "endTime", "day"]) {
        if (!s(r[f])) return `missing ${f}`;
      }
      const day = s(r.day).toLowerCase();
      const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
      if (!DAYS.includes(day)) return `invalid day "${r.day}" (use monday–friday)`;
      const data: ClassSession = {
        id,
        subject: s(r.subject),
        teacherId: s(r.teacherId),
        teacherName: s(r.teacherName),
        classGroup: s(r.classGroup),
        startTime: s(r.startTime),
        endTime: s(r.endTime),
        day: day as ClassSession["day"],
        status: (s(r.status) || "scheduled") as ClassSession["status"],
        color: s(r.color) || undefined,
      };
      return { id, data: { ...data, id: undefined } };
    },
  },
];

/** Load rows from data/<base>.xlsx (preferred) or data/<base>.csv. */
function loadRows(base: string): { rows: Row[]; source: string } | null {
  const xlsxPath = resolve(ROOT, "data", `${base}.xlsx`);
  if (existsSync(xlsxPath)) {
    const wb = XLSX.readFile(xlsxPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
    return { rows, source: `${base}.xlsx` };
  }
  const csvPath = resolve(ROOT, "data", `${base}.csv`);
  if (existsSync(csvPath)) {
    const rows = Papa.parse<Row>(readFileSync(csvPath, "utf8"), {
      header: true,
      skipEmptyLines: true,
    }).data;
    return { rows, source: `${base}.csv` };
  }
  return null;
}

async function main() {
  const keyPath = resolve(ROOT, "serviceAccountKey.json");
  if (!existsSync(keyPath)) {
    console.error(
      "\n✗ serviceAccountKey.json not found at repo root.\n" +
        "  Firebase Console → Project Settings → Service accounts → Generate new private key,\n" +
        "  then save it as serviceAccountKey.json here.\n"
    );
    process.exit(1);
  }

  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  let grandTotal = 0;
  for (const spec of SPECS) {
    const base = spec.file.replace(/\.csv$/, "");
    const loaded = loadRows(base);
    if (!loaded) {
      console.log(`• ${spec.name.padEnd(15)} skipped (no data/${base}.xlsx or .csv)`);
      continue;
    }

    const valid: Mapped[] = [];
    const problems: string[] = [];
    loaded.rows.forEach((row, i) => {
      const result = spec.map(row);
      if (typeof result === "string") problems.push(`  row ${i + 2}: ${result}`);
      else valid.push(result);
    });

    if (valid.length === 0 && problems.length === 0) {
      console.log(`• ${spec.name.padEnd(15)} skipped (empty)`);
      continue;
    }

    await Promise.all(valid.map((m) => db.collection(spec.name).doc(m.id).set(m.data)));
    grandTotal += valid.length;
    console.log(
      `✓ ${spec.name.padEnd(15)} wrote ${valid.length} / skipped ${problems.length}  (from ${loaded.source})`
    );
    if (problems.length) console.log(problems.join("\n"));
  }

  console.log(`\nDone — ${grandTotal} document(s) written to Firestore.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Seeding failed:", err?.message || err);
  process.exit(1);
});
