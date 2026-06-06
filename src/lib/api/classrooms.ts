import { ClassGroup, CreateClassGroupInput } from "@/lib/types";

export const MOCK_CLASSROOMS: ClassGroup[] = [
  { id: "1", name: "4 Bestari", academicYear: 2026, room: "Block A - Room 101", droidId: "DRD-001" },
  { id: "2", name: "5 Amanah", academicYear: 2026, room: "Block A - Room 102", droidId: "DRD-002" },
  { id: "3", name: "3 Cerdas", academicYear: 2026, room: "Block B - Room 201", droidId: "DRD-003" },
  { id: "4", name: "6 Gemilang", academicYear: 2026, room: "Block B - Room 202", droidId: "DRD-005" },
  { id: "5", name: "2 Jujur", academicYear: 2026, room: "Block C - Room 301", droidId: "DRD-006" },
  { id: "6", name: "1 Murni", academicYear: 2026, room: "Block C - Room 302", droidId: "DRD-007" },
  { id: "7", name: "Lab A", academicYear: 2026, room: "Science Wing - Lab A", droidId: "DRD-008" },
  { id: "8", name: "Hall 1", academicYear: 2026, room: "Main Hall" },
  { id: "9", name: "Library", academicYear: 2026, room: "Library" },
];

export async function getClassrooms(): Promise<ClassGroup[]> {
  return MOCK_CLASSROOMS;
}

export async function registerClassGroup(data: CreateClassGroupInput): Promise<ClassGroup> {
  const newGroup: ClassGroup = {
    ...data,
    id: String(Date.now()),
  };
  MOCK_CLASSROOMS.push(newGroup);
  return newGroup;
}
