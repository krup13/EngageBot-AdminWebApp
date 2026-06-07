import { ClassSession, CreateClassSessionInput, SessionDay } from "@/lib/types";
import { isFirebaseConfigured, readAll, create } from "@/lib/firestore";

const COLLECTION = "classSchedules";

export const SESSION_COLORS: Record<string, string> = {
  Mathematics: "#DBEAFE",
  "Bahasa Melayu": "#FEF9C3",
  "English Language": "#EDE9FE",
  Chemistry: "#DCFCE7",
  Physics: "#FEE2E2",
  Science: "#CFFAFE",
  Biology: "#D1FAE5",
  History: "#F3F4F6",
  "Add Maths": "#FEF3C7",
  "P. Islam": "#ECFDF5",
};

export const MOCK_SESSIONS: ClassSession[] = [
  { id: "1", subject: "Mathematics", teacherId: "t1", teacherName: "Cikgu Ahmad", classGroup: "4 Bestari", startTime: "08:00", endTime: "09:30", day: "monday", status: "ongoing", color: SESSION_COLORS["Mathematics"] },
  { id: "2", subject: "English Language", teacherId: "t2", teacherName: "Pn. Sarah", classGroup: "4 Bestari", startTime: "09:30", endTime: "10:30", day: "monday", status: "scheduled", color: SESSION_COLORS["English Language"] },
  { id: "3", subject: "Bahasa Melayu", teacherId: "t3", teacherName: "En. Zul", classGroup: "5 Amanah", startTime: "08:00", endTime: "09:00", day: "tuesday", status: "scheduled", color: SESSION_COLORS["Bahasa Melayu"] },
  { id: "4", subject: "Chemistry", teacherId: "t4", teacherName: "Pn. Lim", classGroup: "3 Cerdas", startTime: "11:00", endTime: "12:30", day: "wednesday", status: "scheduled", color: SESSION_COLORS["Chemistry"] },
  { id: "5", subject: "Biology", teacherId: "t1", teacherName: "En. Rosli", classGroup: "4A", startTime: "11:30", endTime: "12:30", day: "wednesday", status: "scheduled", color: SESSION_COLORS["Biology"] },
  { id: "6", subject: "History", teacherId: "t5", teacherName: "Pn. Siti", classGroup: "4A", startTime: "14:00", endTime: "15:00", day: "wednesday", status: "scheduled", color: SESSION_COLORS["History"] },
  { id: "7", subject: "Add Maths", teacherId: "t6", teacherName: "En. Tan", classGroup: "5C", startTime: "11:00", endTime: "12:30", day: "wednesday", status: "scheduled", color: SESSION_COLORS["Add Maths"] },
  { id: "8", subject: "P. Islam", teacherId: "t7", teacherName: "Ustaz H.", classGroup: "5C", startTime: "15:00", endTime: "16:00", day: "wednesday", status: "scheduled", color: SESSION_COLORS["P. Islam"] },
];

export const DAYS: SessionDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export async function getSessions(): Promise<ClassSession[]> {
  if (!isFirebaseConfigured()) return MOCK_SESSIONS;
  return readAll<ClassSession>(COLLECTION);
}

export async function createSession(data: CreateClassSessionInput): Promise<ClassSession> {
  if (!isFirebaseConfigured()) {
    const newSession: ClassSession = {
      ...data,
      id: String(Date.now()),
      status: "scheduled",
      color: SESSION_COLORS[data.subject] ?? "#F3F4F6",
    };
    MOCK_SESSIONS.push(newSession);
    return newSession;
  }

  const fields: Omit<ClassSession, "id"> = {
    ...data,
    status: "scheduled",
    color: SESSION_COLORS[data.subject] ?? "#F3F4F6",
  };
  return create<ClassSession>(COLLECTION, fields);
}
