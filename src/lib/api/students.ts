import { Student, CreateStudentInput } from "@/lib/types";

export const MOCK_STUDENTS: Student[] = [
  { id: "1", studentId: "STU-00001", name: "Ahmad bin Zulkifli", icNumber: "120512101234", classGroup: "4 Gemilang", source: "manual", status: "verified" },
  { id: "2", studentId: "STU-00002", name: "Siti Nurhaliza binti Bakri", icNumber: "121015015678", classGroup: "4 Gemilang", source: "manual", status: "verified" },
  { id: "3", studentId: "STU-00003", name: "Lim Wei Ming", icNumber: "120205019987", classGroup: "5 Zamrud", source: "csv", status: "verified" },
  { id: "4", studentId: "STU-00004", name: "Chong Kah Wai", icNumber: "110310045512", classGroup: "5 Zamrud", source: "csv", status: "verified" },
  { id: "5", studentId: "STU-00005", name: "Nurul Izzah binti Hassan", icNumber: "120820071234", classGroup: "4 Gemilang", source: "csv", status: "pending" },
  { id: "6", studentId: "STU-00006", name: "Ramasamy a/l Subramaniam", icNumber: "080415081122", classGroup: "5 Zamrud", source: "manual", status: "verified" },
  { id: "7", studentId: "STU-00007", name: "Mei Ling Tan", icNumber: "080210146677", classGroup: "5 Zamrud", source: "csv", status: "error" },
];

export async function getStudents(): Promise<Student[]> {
  return MOCK_STUDENTS;
}

export async function registerStudent(data: CreateStudentInput): Promise<Student> {
  const newStudent: Student = {
    ...data,
    id: String(Date.now()),
    studentId: `STU-${String(MOCK_STUDENTS.length + 1).padStart(5, "0")}`,
    source: "manual",
    status: "pending",
  };
  MOCK_STUDENTS.push(newStudent);
  return newStudent;
}
