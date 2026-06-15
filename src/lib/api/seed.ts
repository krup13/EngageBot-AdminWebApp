import { isFirebaseConfigured, setWithId } from "@/lib/firestore";
import { MOCK_TEACHERS } from "./teachers";
import { MOCK_STUDENTS } from "./students";
import { MOCK_CLASSROOMS } from "./classrooms";
import { MOCK_DROIDS } from "./droids";
import { MOCK_SESSIONS } from "./schedules";
import { MOCK_SESSION_REPORTS } from "./reports";

export interface SeedResult {
  collection: string;
  count: number;
}

// Each mock item is written using its own `id` as the Firestore document id, so
// cross-collection references stay consistent (e.g. classSchedules.teacherId
// "1" matches teachers/1). Re-running overwrites the same docs — no duplicates.
const GROUPS: [string, { id: string }[]][] = [
  ["teachers", MOCK_TEACHERS],
  ["students", MOCK_STUDENTS],
  ["classGroups", MOCK_CLASSROOMS],
  ["droids", MOCK_DROIDS],
  ["classSchedules", MOCK_SESSIONS],
  ["sessionReports", MOCK_SESSION_REPORTS],
];

/**
 * Push all the mock/sample data into the live Firestore collections. Requires an
 * admin to be signed in (security rules gate writes; sessionReports needs the
 * admin-write rule — redeploy firestore.rules after changing it).
 */
export async function seedDatabase(): Promise<SeedResult[]> {
  if (!isFirebaseConfigured()) {
    throw new Error("Connect Firebase first (real credentials in .env.local).");
  }

  const results: SeedResult[] = [];
  for (const [name, items] of GROUPS) {
    await Promise.all(
      items.map((item) => {
        const { id, ...rest } = item as { id: string } & Record<string, unknown>;
        return setWithId(name, id, rest);
      })
    );
    results.push({ collection: name, count: items.length });
  }
  return results;
}
