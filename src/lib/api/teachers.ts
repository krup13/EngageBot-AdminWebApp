import { Teacher, CreateTeacherInput } from "@/lib/types";
import { isFirebaseConfigured, readAll, create, nextSequence } from "@/lib/firestore";

const COLLECTION = "teachers";

export const MOCK_TEACHERS: Teacher[] = [
  { id: "1", employeeId: "EB-2024-042", name: "Siti Aminah binti Yusof", email: "siti.aminah@moe.gov.my", department: "Science & Math", assignedClasses: ["4 Bestari", "5 Amanah"], dateAdded: "2024-01-12", status: "active" },
  { id: "2", employeeId: "EB-2024-055", name: "Robert Tan Wei Keong", email: "robert.tan@moe.gov.my", department: "Languages", assignedClasses: ["3 Cekap", "6 Gigih"], dateAdded: "2024-01-15", status: "active" },
  { id: "3", employeeId: "EB-2024-089", name: "Ahmad Faizal Bin Kassim", email: "ahmad.faizal@moe.gov.my", department: "Social Studies", assignedClasses: ["4 Maju"], dateAdded: "2024-02-02", status: "active" },
  { id: "4", employeeId: "EB-2024-112", name: "Nandini Rajaratnam", email: "nandini.r@moe.gov.my", department: "Science & Math", assignedClasses: ["5 Bestari", "5 Cekap"], dateAdded: "2024-03-10", status: "active" },
  { id: "5", employeeId: "EB-2024-156", name: "Mohd Ridzuan bin Ismail", email: "ridzuan@moe.gov.my", department: "Technical & Vocational", assignedClasses: ["6 Bestari", "6 Maju"], dateAdded: "2024-03-22", status: "active" },
];

export async function getTeachers(): Promise<Teacher[]> {
  if (!isFirebaseConfigured()) return MOCK_TEACHERS;
  return readAll<Teacher>(COLLECTION);
}

export async function registerTeacher(data: CreateTeacherInput): Promise<Teacher> {
  if (!isFirebaseConfigured()) {
    const newTeacher: Teacher = {
      ...data,
      id: String(Date.now()),
      employeeId: `EB-2026-${String(MOCK_TEACHERS.length + 1).padStart(3, "0")}`,
      dateAdded: new Date().toISOString().split("T")[0],
      status: "pending",
      authUid: null,
    };
    MOCK_TEACHERS.push(newTeacher);
    return newTeacher;
  }

  const seq = await nextSequence(COLLECTION);
  const fields: Omit<Teacher, "id"> = {
    ...data,
    employeeId: `EB-2026-${String(seq).padStart(3, "0")}`,
    dateAdded: new Date().toISOString().split("T")[0],
    status: "pending",
    authUid: null, // linked when the teacher first signs into the mobile app
  };
  return create<Teacher>(COLLECTION, fields);
}
