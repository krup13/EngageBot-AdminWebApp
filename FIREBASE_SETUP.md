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

---

## Google Calendar sync (Schedules → "Finish Editing")

The admin grants a Calendar scope at sign-in, and the app creates a weekly
recurring event per class with the **teacher added as an attendee** (they get a
calendar invite on their own Google Calendar).

**Console setup (one-time):**
1. Google Cloud Console (same project) → **APIs & Services → Library** → enable
   **Google Calendar API**.
2. **APIs & Services → OAuth consent screen** → add the scope
   `https://www.googleapis.com/auth/calendar.events`. While the consent screen is
   in "Testing", add your admin accounts under **Test users**.
3. Sign in again (so the new scope is granted) → open **Schedules** → **Finish
   Editing** to push the timetable. A success banner confirms how many were synced.

**Notes / caveat:**
- Requires real Google sign-in — calendar sync is unavailable in dev-bypass mode
  (`NEXT_PUBLIC_DEV_BYPASS=true`), which shows an explanatory message instead.
- Events are created on the **admin's** calendar with each teacher as an attendee
  (invite). Writing directly onto each teacher's calendar with no invite needs
  Google Workspace **domain-wide delegation** + a server/service account — a
  larger setup intentionally left out of this client-only app.

---

## Mobile notifications (relief / late alerts)

The admin app **writes** notification documents to the `/notifications` collection
(e.g. when a conflict is auto-resolved with a relief teacher). Actual push
delivery is the **mobile app's** job (Firebase Cloud Messaging, separate repo):
it listens to `/notifications where teacherId == <me> and read == false` and
shows/pushes them. This repo does not send pushes.

---

## Testing: register a teacher (web) → teacher signs into mobile

End-to-end test that an admin-registered teacher — and only a registered teacher —
can sign into the mobile app.

**Prerequisite:** the web app and the mobile app must point to the **same Firebase
project**, and `firestore.rules` must be deployed.

**On the admin web app:**
1. In `.env.local`, paste the 6 real `NEXT_PUBLIC_FIREBASE_*` values, set
   `NEXT_PUBLIC_DEV_BYPASS=false`, keep `gmail.com` in `NEXT_PUBLIC_ALLOWED_DOMAINS`
   (for gmail test accounts). Restart `npm run dev`.
2. Sign in with a real Google **test-user** account → first login auto-creates
   `/users/{uid}` with role `admin` (lets you write teacher records).
3. **Register Teacher** → enter the teacher's **exact Google email** (the one they'll
   sign into mobile with) + a name → Submit.
4. Confirm in the Firestore console: `/teachers/{id}` exists with the **lowercased**
   email, `authUid: null`, `status: "pending"`. (`registerTeacher` lowercases the
   email and skips duplicates so the mobile lookup is an exact, unambiguous match.)

**On the mobile app (separate Flutter repo) — the login gate:**
After Firebase Google sign-in, the app must look the teacher up and reject anyone
without a record (otherwise plain Google sign-in admits anyone):

```dart
final user = (await FirebaseAuth.instance.signInWithProvider(GoogleAuthProvider())).user!;
final email = user.email!.toLowerCase();

final snap = await FirebaseFirestore.instance
    .collection('teachers').where('email', isEqualTo: email).limit(1).get();

if (snap.docs.isEmpty) {
  await FirebaseAuth.instance.signOut();        // blocked: not registered by admin
} else {
  final doc = snap.docs.first;
  await doc.reference.update({'authUid': user.uid});   // link account (allowed by rules)
  await FirebaseFirestore.instance.doc('users/${user.uid}')
      .set({'teacherId': doc.id, 'role': 'teacher', 'email': email}, SetOptions(merge: true));
  // proceed into the app
}
```

**Expected:** registered email → sign-in succeeds and links the account; any
unregistered email → rejected. Common failure causes: the two apps on different
Firebase projects, rules not deployed, or registering an email that differs from the
one the teacher actually signs in with.
