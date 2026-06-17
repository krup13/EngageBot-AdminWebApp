// This file previously contained Firestore helpers. All data access now goes
// through the REST API via src/lib/api-client.ts. This file is kept as a
// compatibility shim — all api/*.ts files have been updated to use apiClient
// directly and no longer import from here.

export {};
