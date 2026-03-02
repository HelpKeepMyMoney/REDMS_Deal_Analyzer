/**
 * REDMS Admin Cloud Functions.
 * Requires caller to be in admins/{uid} collection.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const auth = getAuth();
const db = getFirestore();

async function requireAdmin(context) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  const adminDoc = await db.doc(`admins/${context.auth.uid}`).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

exports.listUsers = onCall(async (request) => {
  await requireAdmin(request);
  const users = [];
  let nextPageToken;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    for (const u of result.users) {
      const adminDoc = await db.doc(`admins/${u.uid}`).get();
      users.push({
        uid: u.uid,
        email: u.email,
        role: adminDoc.exists ? "admin" : "user",
        created: u.metadata.creationTime,
      });
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  return { users };
});

exports.createUser = onCall(async (request) => {
  await requireAdmin(request);
  const { email, password, role } = request.data;
  if (!email || !password) {
    throw new HttpsError("invalid-argument", "email and password required");
  }
  const userRecord = await auth.createUser({ email, password });
  if (role === "admin") {
    await db.doc(`admins/${userRecord.uid}`).set({});
  }
  return { uid: userRecord.uid };
});

exports.setUserRole = onCall(async (request) => {
  await requireAdmin(request);
  const { uid, role } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "uid required");
  }
  const adminRef = db.doc(`admins/${uid}`);
  if (role === "admin") {
    await adminRef.set({});
  } else {
    await adminRef.delete();
  }
  return { ok: true };
});
