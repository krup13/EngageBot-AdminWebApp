import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Auto-detect long-polling so Firestore still connects on networks (VPNs,
 * proxies, corporate firewalls, some Windows stacks) that block its default
 * WebChannel streaming transport — the usual cause of "client is offline".
 *
 * `initializeFirestore` may only be called once per app; on Turbopack/HMR
 * re-runs the instance already exists, so fall back to `getFirestore`.
 */
function getDb() {
  try {
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}
export const db = getDb();

/**
 * True only when real Firebase credentials are present in `.env.local`.
 * While the project still has placeholder values (`your-api-key`), the API
 * layer falls back to mock data so the app keeps working in development.
 */
export function isFirebaseConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return Boolean(key && key !== "your-api-key");
}

export default app;
