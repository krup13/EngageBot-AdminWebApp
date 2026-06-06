import { Droid, CreateDroidInput } from "@/lib/types";

export const MOCK_DROIDS: Droid[] = [
  { id: "1", droidId: "DRD-001", serialNumber: "EB-9921-X1", assignedRoom: "4 Bestari", firmware: "v2.1.4", battery: 92, lastPing: "2 mins ago", status: "active" },
  { id: "2", droidId: "DRD-002", serialNumber: "EB-9921-X2", assignedRoom: "5 Amanah", firmware: "v2.1.4", battery: 45, lastPing: "1 hour ago", status: "inactive" },
  { id: "3", droidId: "DRD-003", serialNumber: "EB-9921-X3", assignedRoom: "3 Cerdas", firmware: "v2.1.3", battery: 12, lastPing: "5 mins ago", status: "active" },
  { id: "4", droidId: "DRD-004", serialNumber: "EB-9921-X4", assignedRoom: "Unassigned", firmware: "v2.0.8", battery: 0, lastPing: "3 days ago", status: "offline" },
  { id: "5", droidId: "DRD-005", serialNumber: "EB-9921-X5", assignedRoom: "6 Gemilang", firmware: "v2.1.4", battery: 88, lastPing: "12 mins ago", status: "active" },
  { id: "6", droidId: "DRD-006", serialNumber: "EB-9921-X6", assignedRoom: "2 Jujur", firmware: "v2.1.4", battery: 67, lastPing: "45 mins ago", status: "active" },
  { id: "7", droidId: "DRD-007", serialNumber: "EB-9921-X7", assignedRoom: "1 Murni", firmware: "v2.1.5", battery: 99, lastPing: "Just now", status: "active" },
  { id: "8", droidId: "DRD-008", serialNumber: "EB-9921-X8", assignedRoom: "Lab A", firmware: "v2.1.4", battery: 32, lastPing: "2 hours ago", status: "inactive" },
];

export const SIDEBAR_DROIDS = MOCK_DROIDS.slice(0, 5).map((d) => ({
  id: d.droidId,
  serial: d.serialNumber,
  room: d.assignedRoom,
  battery: d.battery,
  status: d.status,
}));

export async function getDroids(): Promise<Droid[]> {
  return MOCK_DROIDS;
}

export async function registerDroid(data: CreateDroidInput): Promise<Droid> {
  const newDroid: Droid = {
    ...data,
    id: String(Date.now()),
    droidId: `DRD-${String(MOCK_DROIDS.length + 1).padStart(3, "0")}`,
    battery: 0,
    lastPing: "Waiting for first ping…",
    status: "inactive",
  };
  MOCK_DROIDS.push(newDroid);
  return newDroid;
}
