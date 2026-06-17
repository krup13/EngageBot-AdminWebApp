import { apiClient, isConfigured } from "@/lib/api-client";
import { MOCK_TEACHERS } from "./teachers";
import { MOCK_STUDENTS } from "./students";
import { MOCK_CLASSROOMS } from "./classrooms";
import { MOCK_DROIDS } from "./droids";
import { MOCK_SESSIONS } from "./schedules";

export interface SeedResult {
  collection: string;
  count: number;
}

// Seeds the live MongoDB database with mock sample data via the REST API.
// Requires the admin to be signed in (JWT attached by apiClient automatically).
// Teachers are seeded with a default temporary password "EngageBot2026!".
export async function seedDatabase(): Promise<SeedResult[]> {
  if (!isConfigured()) {
    throw new Error("Set NEXT_PUBLIC_API_URL in .env.local and restart the dev server.");
  }

  const results: SeedResult[] = [];

  // Teachers — password is required by the API
  let seededTeachers = 0;
  for (const t of MOCK_TEACHERS) {
    try {
      await apiClient.post("/teachers", {
        name: t.name,
        email: t.email,
        password: "EngageBot2026!",
        department: t.department,
        assignedClasses: t.assignedClasses,
      });
      seededTeachers++;
    } catch {
      // Skip duplicates (teacher already exists)
    }
  }
  results.push({ collection: "teachers", count: seededTeachers });

  // Students
  let seededStudents = 0;
  for (const s of MOCK_STUDENTS) {
    try {
      await apiClient.post("/students", {
        name: s.name,
        icNumber: s.icNumber,
        classGroup: s.classGroup,
      });
      seededStudents++;
    } catch {
      // Skip duplicates
    }
  }
  results.push({ collection: "students", count: seededStudents });

  // Class groups
  let seededGroups = 0;
  for (const g of MOCK_CLASSROOMS) {
    try {
      await apiClient.post("/class-groups", {
        name: g.name,
        academicYear: g.academicYear,
        room: g.room,
        droidId: g.droidId,
      });
      seededGroups++;
    } catch {
      // Skip duplicates
    }
  }
  results.push({ collection: "classGroups", count: seededGroups });

  // Droids
  let seededDroids = 0;
  for (const d of MOCK_DROIDS) {
    try {
      await apiClient.post("/droids", {
        serialNumber: d.serialNumber,
        assignedRoom: d.assignedRoom,
        firmware: d.firmware,
      });
      seededDroids++;
    } catch {
      // Skip duplicates
    }
  }
  results.push({ collection: "droids", count: seededDroids });

  // Schedules
  let seededSessions = 0;
  for (const s of MOCK_SESSIONS) {
    try {
      await apiClient.post("/schedules", {
        subject: s.subject,
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        classGroup: s.classGroup,
        startTime: s.startTime,
        endTime: s.endTime,
        day: s.day,
      });
      seededSessions++;
    } catch {
      // Skip duplicates
    }
  }
  results.push({ collection: "classSchedules", count: seededSessions });

  return results;
}
