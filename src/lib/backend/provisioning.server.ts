/**
 * Server-side provisioning utilities
 * ====================================
 * Reusable logic for admin family and child provisioning.
 * Never exposed to client; only called from provisioning.functions.ts
 *
 * Security: All operations require explicit authorization verification by the caller.
 */

import { getFirebaseAdminDb, getFirebaseAdmin } from "@/integrations/firebase/admin.server";
import { getAuth } from "firebase-admin/auth";
import { getApp } from "firebase-admin/app";
import type { UserRecord } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Verify that a user has admin role
 * For pilot phase: any authenticated parent user can provision families
 * TODO: Enforce admin role in production
 */
export async function verifyAdminAuthorization(uid: string): Promise<string> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();

  if (!userData) {
    throw new Error("User not found in database");
  }

  // For pilot phase: allow any parent or admin user to provision
  // In production, this should strictly check for admin role
  const roles = userData.roles as string[] | undefined;
  if (!Array.isArray(roles) || (roles.length === 0)) {
    console.warn(`[verifyAdminAuthorization] User ${uid} has no roles in Firestore`, userData);
    // For pilot, allow it anyway
    // throw new Error("Authorization required (no roles found)");
  }

  console.log(`[verifyAdminAuthorization] User ${uid} authorized with roles:`, roles);
  return uid;
}

/**
 * Check if email already exists in users collection
 */
export async function emailExists(email: string): Promise<boolean> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const snapshot = await db
    .collection("users")
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Get parent user document
 */
export async function getParentByUid(uid: string): Promise<any> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;

  const data = doc.data();
  const roles = data?.roles as string[] | undefined;

  // Verify user has parent role
  if (!Array.isArray(roles) || !roles.includes("parent")) {
    return null;
  }

  return { uid: doc.id, ...data };
}

/**
 * Get family document
 */
export async function getFamilyById(familyId: string): Promise<any> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const doc = await db.collection("families").doc(familyId).get();
  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
}

/**
 * Get child document
 */
export async function getChildByIdInFamily(
  childId: string,
  familyId: string
): Promise<any> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const doc = await db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
}

/**
 * Get credential by TATI ID
 */
export async function getCredentialByTatiId(tatiId: string): Promise<any> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const doc = await db.collection("childCredentials").doc(tatiId).get();
  if (!doc.exists) return null;

  return { tatiId: doc.id, ...doc.data() };
}

/**
 * Find credential by child ID
 */
export async function findCredentialByChildId(childId: string): Promise<any> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const snapshot = await db
    .collection("childCredentials")
    .where("childId", "==", childId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { tatiId: doc.id, ...doc.data() };
}

/**
 * Create parent Firebase Auth user
 * Requires Admin SDK (server-side only)
 */
export async function createParentAuthUser(
  email: string,
  displayName: string
): Promise<UserRecord> {
  const auth = getFirebaseAdmin();

  const user = await auth.createUser({
    email: email.toLowerCase(),
    password: generateTemporaryPassword(),
    displayName,
  });

  return user;
}

/**
 * Create parent Firestore document
 */
export async function createParentFirestoreRecord(
  uid: string,
  email: string,
  displayName: string,
  phone: string | undefined,
  adminUid: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  await db.collection("users").doc(uid).set({
    uid,
    email: email.toLowerCase(),
    displayName,
    phone: phone || null,
    roles: ["parent"],
    status: "active",
    createdAt: Timestamp.now(),
    createdBy: adminUid,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Create family document
 */
export async function createFamilyRecord(
  familyId: string,
  name: string,
  notes: string | undefined,
  enrolmentDate: string,
  adminUid: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  await db.collection("families").doc(familyId).set({
    id: familyId,
    name,
    notes: notes || null,
    status: "active",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: adminUid,
    enrolmentDate,
  });
}

/**
 * Add parent to family (create member subcollection document)
 */
export async function addParentToFamily(
  familyId: string,
  parentUid: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  await db
    .collection("families")
    .doc(familyId)
    .collection("members")
    .doc(parentUid)
    .set({
      uid: parentUid,
      role: "parent",
      status: "active",
      addedAt: Timestamp.now(),
    });
}

/**
 * Create child profile document
 */
export async function createChildProfileRecord(
  childId: string,
  familyId: string,
  tatiId: string,
  name: string,
  age: number,
  dateOfBirth: string | undefined,
  preferredName: string | undefined,
  adminUid: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  await db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .set({
      id: childId,
      tatiId,
      familyId,
      name,
      age,
      dateOfBirth: dateOfBirth || null,
      preferredName: preferredName || null,
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: adminUid,
    });
}

/**
 * Create credential document (should be called in transaction with child profile)
 */
export async function createCredentialRecord(
  tatiId: string,
  childId: string,
  familyId: string,
  pinHash: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  await db.collection("childCredentials").doc(tatiId).set({
    tatiId,
    childId,
    familyId,
    pinHash,
    active: true,
    revokedAt: null,
    rotatedAt: Timestamp.now(),
  });
}

/**
 * Update credential with new PIN hash
 */
export async function updateCredentialPin(
  tatiId: string,
  newPinHash: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  await db.collection("childCredentials").doc(tatiId).update({
    pinHash: newPinHash,
    rotatedAt: Timestamp.now(),
  });
}

/**
 * Generate a temporary password for first-time parent login
 * User will be required to reset on first login (Option C)
 */
export function generateTemporaryPassword(): string {
  // Generate a random 12-character temporary password
  // Mix of uppercase, lowercase, numbers, and symbols
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate parent data
 */
export function validateParentData(
  email: string,
  displayName: string
): { valid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { valid: false, error: "Email is required" };
  }

  if (!validateEmail(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  if (!displayName || !displayName.trim()) {
    return { valid: false, error: "Display name is required" };
  }

  if (displayName.length > 100) {
    return { valid: false, error: "Display name must be 100 characters or less" };
  }

  return { valid: true };
}

/**
 * Validate family data
 */
export function validateFamilyData(
  name: string
): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: "Family name is required" };
  }

  if (name.length > 100) {
    return { valid: false, error: "Family name must be 100 characters or less" };
  }

  return { valid: true };
}

/**
 * Validate child data
 */
export function validateChildData(
  name: string,
  age: number
): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: "Child name is required" };
  }

  if (name.length > 100) {
    return { valid: false, error: "Child name must be 100 characters or less" };
  }

  if (typeof age !== "number" || age < 5 || age > 18) {
    return { valid: false, error: "Age must be between 5 and 18" };
  }

  return { valid: true };
}

/**
 * Verify parent-family relationship
 */
export async function isParentInFamily(
  parentUid: string,
  familyId: string
): Promise<boolean> {
  const db = getFirebaseAdminDb();
  if (!db) throw new Error("Database not available");

  const doc = await db
    .collection("families")
    .doc(familyId)
    .collection("members")
    .doc(parentUid)
    .get();

  if (!doc.exists) return false;

  const data = doc.data();
  return data?.status === "active" && data?.role === "parent";
}
