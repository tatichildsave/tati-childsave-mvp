/**
 * Firebase Admin Utilities (Phase G1: Trusted Server Foundation)
 *
 * Small server-only access primitives for:
 * - Admin Firestore operations
 * - Admin Auth operations
 *
 * These are building blocks for later phases (G2-G5) that will implement:
 * - Child authentication
 * - Session management
 * - Assessment workflows
 * - Scenario transitions
 * - Achievement awarding
 *
 * For now, this module provides only the infrastructure primitives.
 */

import type { Auth } from "firebase-admin/auth";
import type { Firestore, CollectionReference } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/integrations/firebase/admin.server";

/**
 * Get the Admin Firestore instance (server-only).
 * Use this to perform privileged operations that bypass security rules.
 */
export function adminFirestore(): Firestore {
  return getFirebaseAdminDb();
}

/**
 * Get the Admin Auth instance (server-only).
 * Use this to perform privileged auth operations (creating users, issuing custom tokens, etc).
 */
export function adminAuth(): Auth {
  return getFirebaseAdminAuth();
}

/**
 * Get a Firestore collection reference (server-only).
 * Useful for batch operations, transactions, etc.
 */
export function adminCollection(path: string): CollectionReference {
  return adminFirestore().collection(path);
}

/**
 * Firestore document reference helper (server-only).
 * Example: adminDoc("users/alice")
 */
export function adminDoc(path: string) {
  return adminFirestore().doc(path);
}

/**
 * Verify a Firebase auth token (server-only).
 * Useful for validating tokens passed from client code.
 */
export async function verifyAuthToken(token: string): Promise<{ uid: string; email?: string }> {
  const decoded = await adminAuth().verifyIdToken(token, true);
  return { uid: decoded.uid, ...(decoded.email ? { email: decoded.email } : {}) };
}
