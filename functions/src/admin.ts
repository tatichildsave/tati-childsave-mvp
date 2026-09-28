import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

/**
 * Create a new admin user via HTTP callable function
 * Only existing admins can call this
 */
export const createAdminUser = functions.https.onCall(async (data, context) => {
  // Check that user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check that caller is admin
  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "User document not found");
  }

  const callerRoles = callerDoc.data()?.roles || [];
  if (!Array.isArray(callerRoles) || !callerRoles.includes("admin")) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can create admin users");
  }

  // Validate input
  const { email, password } = data;
  if (!email || typeof email !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Valid email required");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Password must be at least 6 characters",
    );
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });

    // Create user document in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      roles: ["admin"],
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
    });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    return {
      success: true,
      message: "Admin user created successfully",
      uid: userRecord.uid,
      email,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new functions.https.HttpsError(
      "internal",
      `Failed to create admin user: ${message}`,
    );
  }
});

/**
 * Create a new facilitator user via HTTP callable function
 * Only admins can call this
 */
export const createFacilitatorUser = functions.https.onCall(async (data, context) => {
  // Check that user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check that caller is admin
  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "User document not found");
  }

  const callerRoles = callerDoc.data()?.roles || [];
  if (!Array.isArray(callerRoles) || !callerRoles.includes("admin")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can create facilitator users",
    );
  }

  // Validate input
  const { email, schoolId } = data;
  if (!email || typeof email !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Valid email required");
  }
  if (!schoolId || typeof schoolId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Valid schoolId required");
  }

  // Verify school exists
  const schoolDoc = await db.collection("schools").doc(schoolId).get();
  if (!schoolDoc.exists) {
    throw new functions.https.HttpsError("not-found", "School not found");
  }

  try {
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12);

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password: tempPassword,
      emailVerified: false,
    });

    // Create user document in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      roles: ["facilitator"],
      status: "active",
      schoolId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
      tempPassword, // Store for admin to communicate to facilitator
    });

    // Create facilitator profile
    await db.collection("schools").doc(schoolId).collection("facilitators").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: email.split("@")[0],
      status: "active",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Facilitator user created successfully",
      uid: userRecord.uid,
      email,
      tempPassword,
      schoolId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new functions.https.HttpsError(
      "internal",
      `Failed to create facilitator user: ${message}`,
    );
  }
});

/**
 * Assign school administrator
 * Only admins can call this
 */
export const assignSchoolAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check caller is admin
  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "User document not found");
  }

  const callerRoles = callerDoc.data()?.roles || [];
  if (!Array.isArray(callerRoles) || !callerRoles.includes("admin")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can assign school admins",
    );
  }

  const { schoolId, adminUid } = data;
  if (!schoolId || !adminUid) {
    throw new functions.https.HttpsError("invalid-argument", "schoolId and adminUid required");
  }

  try {
    // Add admin to school
    await db.collection("schools").doc(schoolId).collection("admins").doc(adminUid).set({
      uid: adminUid,
      role: "school_admin",
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedBy: context.auth.uid,
    });

    // Update user's roles if needed
    const userDoc = await db.collection("users").doc(adminUid).get();
    const currentRoles = userDoc.data()?.roles || [];
    if (!currentRoles.includes("schoolAdmin")) {
      await db.collection("users").doc(adminUid).update({
        roles: [...currentRoles, "schoolAdmin"],
      });
    }

    return {
      success: true,
      message: "School admin assigned successfully",
      schoolId,
      adminUid,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new functions.https.HttpsError("internal", `Failed to assign school admin: ${message}`);
  }
});
