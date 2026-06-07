# Firebase Setup — EngageBot Admin Web App

This app is **single-tenant**: one Firebase project per school. Until you fill in
real credentials below, the app runs entirely on mock data (`isFirebaseConfigured()`
returns `false`), so you can develop without a backend.

## 1. Create the project

1. <https://console.firebase.google.com> → **Add project** (one per school).
2. **Build → Firestore Database → Create database** (Production mode, region near you).
3. **Build → Authentication → Get started → Google** → enable.
4. **Project settings → General → Your apps → Web app** → copy the config values.

## 2. Fill `.env.local`

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# This school's allowed login domain(s). Government schools: moe.gov.my.
# Private / international schools: their own domain (e.g. stmarys.edu.my).
NEXT_PUBLIC_ALLOWED_DOMAINS=moe.gov.my

# Turn OFF the dev bypass so real Google sign-in is used.
NEXT_PUBLIC_DEV_BYPASS=false
```

The app flips from mock data to live Firestore automatically once
`NEXT_PUBLIC_FIREBASE_API_KEY` is no longer the placeholder `your-api-key`.

## 3. Deploy security rules

The collection rules live in [`firestore.rules`](./firestore.rules).

```
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## 4. Provision the first admin

Google sign-in authenticates anyone, but the app only treats you as an admin if
`/users/{yourUid}` has `role: "admin"`. The first allowed-domain login creates
that doc with `role: "admin"` automatically (see `ensureUserProfile`). To make
someone a **super_admin**, edit their `/users` doc in the console.

## 5. (Optional) Seed initial data

Add a few documents by hand in the console, or register them through the app UI
once logged in. Collections used by the admin app:
`users, teachers, students, classGroups, classrooms, droids, subjects,
classSchedules, sessionReports, auditLogs`.

---

## Teacher login contract (for the Flutter mobile-app developer)

Teachers are **not** created in Firebase Auth by the web app. The admin creates a
`/teachers` document with `authUid: null`. Login must only succeed for a teacher
who has such a record. The mobile app enforces this:

1. Teacher taps **Sign in with Google** → Firebase Auth succeeds for any account.
2. Immediately query: `teachers where email == <signed-in email>`.
3. **No match** → `FirebaseAuth.signOut()` and show
   *"Your account hasn't been registered by your school admin."*
4. **Match** → write `authUid = <uid>` onto that teacher doc (allowed by the
   security rule that lets a teacher stamp their own uid) and proceed.

The `firestore.rules` in this repo back this up server-side: a signed-in user who
is neither a provisioned admin nor a registered teacher is denied all data access,
so the gate holds even if the client check is bypassed.
