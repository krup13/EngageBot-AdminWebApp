import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { AdminUser } from "@/lib/types";

const COLLECTION = "users";

/**
 * Ensure a /users/{authUid} profile exists for a signed-in person and return it.
 *
 * - Admins: the first authorized (allowed-domain) Google login creates a doc
 *   with role "admin". A SuperAdmin can later promote/demote via the console.
 * - Teachers: their /teachers record is created by the admin first; the mobile
 *   app links the auth uid. On the web this just reads the existing profile.
 *
 * No-op (returns the passed-in user) when Firebase isn't configured yet, so the
 * dev-bypass flow keeps working without touching Firestore.
 */
export async function ensureUserProfile(user: AdminUser): Promise<AdminUser> {
  if (!isFirebaseConfigured()) return user;

  const ref = doc(db, COLLECTION, user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { uid: user.uid, ...(snap.data() as Omit<AdminUser, "uid">) };
  }

  const profile: Omit<AdminUser, "uid"> = {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: "admin",
  };
  await setDoc(ref, { ...profile, createdAt: new Date().toISOString() });
  return { uid: user.uid, ...profile };
}
