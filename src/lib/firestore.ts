// Thin Firestore data-access helpers shared by the API layer (src/lib/api/*).
// Each API function calls isFirebaseConfigured() and only reaches Firestore when
// real credentials exist; otherwise it returns its local mock data.

import {
  collection,
  getDocs,
  getCountFromServer,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export { isFirebaseConfigured, where };

/** Read every document in a collection, mapping the Firestore doc id onto `id`. */
export async function readAll<T>(name: string): Promise<T[]> {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
}

/** Read documents matching the given query constraints (where/orderBy/limit). */
export async function readWhere<T>(
  name: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const snap = await getDocs(query(collection(db, name), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
}

/** Create a document (Firestore assigns the id); returns the entity with `id`. */
export async function create<T>(name: string, data: Omit<T, "id">): Promise<T> {
  const ref = await addDoc(collection(db, name), data as Record<string, unknown>);
  return { id: ref.id, ...(data as object) } as T;
}

/** Write a document at a specific id (overwrites if it exists). Used for seeding
 *  so mock ids are preserved and cross-collection references stay consistent. */
export async function setWithId<T>(
  name: string,
  id: string,
  data: Omit<T, "id">
): Promise<void> {
  await setDoc(doc(db, name, id), data as Record<string, unknown>);
}

/** Patch fields on an existing document by id. */
export async function update<T>(
  name: string,
  id: string,
  patch: Partial<Omit<T, "id">>
): Promise<void> {
  await updateDoc(doc(db, name, id), patch as Record<string, unknown>);
}

/**
 * Next 1-based sequence number for a collection, used to mint human-readable
 * ids like EB-2026-001 / STU-00001 / DRD-001. Not concurrency-safe — adequate
 * for single-admin school usage; swap for a counter doc if that changes.
 */
export async function nextSequence(name: string): Promise<number> {
  const snap = await getCountFromServer(collection(db, name));
  return snap.data().count + 1;
}
