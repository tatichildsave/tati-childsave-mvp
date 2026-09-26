/**
 * Server-side Firebase Admin SDK boundary (Phase G1: Trusted Server Foundation).
 *
 * - Admin SDK must never be imported into client/browser modules.
 * - Admin initialization is lazy and safe for both production and emulator.
 * - Emulator uses credentials from environment variables or defaults.
 * - Production uses credentials from secure deployment secrets.
 * - Never place Admin credentials in VITE_ variables.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const isEmulatorMode = () => !!process.env["FIRESTORE_EMULATOR_HOST"];

let adminApp = getApps()[0];
let adminAuthCache: Auth | null = null;
let adminDbCache: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK app (lazy singleton).
 * Supports both emulator and production modes.
 * The Firebase Admin SDK respects FIRESTORE_EMULATOR_HOST and
 * FIREBASE_AUTH_EMULATOR_HOST environment variables automatically.
 */
function initializeAdminApp() {
  if (adminApp) return adminApp;

  const projectId = process.env["FIREBASE_PROJECT_ID"];
  if (!projectId && !isEmulatorMode()) {
    throw new Error("FIREBASE_PROJECT_ID env var is required for production Firebase.");
  }

  // For emulator: initialize with demo project ID, no service account needed
  // For production: service account will be loaded from GOOGLE_APPLICATION_CREDENTIALS
  // The Admin SDK automatically respects emulator env vars
  adminApp = initializeApp({
    projectId: projectId || "demo-tati", // emulator default
  });

  return adminApp;
}

/**
 * Get Firebase Admin Auth instance.
 * Safe for use in server-only contexts.
 * Automatically connects to Auth emulator if FIREBASE_AUTH_EMULATOR_HOST is set.
 */
export function getFirebaseAdminAuth(): Auth {
  if (!adminAuthCache) {
    adminAuthCache = getAuth(initializeAdminApp());
    // Note: Firebase Admin SDK automatically respects FIREBASE_AUTH_EMULATOR_HOST env var
    // No explicit useEmulator() call needed - it's automatic
  }
  return adminAuthCache;
}

/**
 * Get Firebase Admin Firestore instance.
 * Safe for use in server-only contexts.
 * Automatically connects to Firestore emulator if FIRESTORE_EMULATOR_HOST is set.
 */
export function getFirebaseAdminDb(): Firestore {
  if (!adminDbCache) {
    adminDbCache = getFirestore(initializeAdminApp());
    // Note: Firebase Admin SDK automatically respects FIRESTORE_EMULATOR_HOST env var
    // No explicit useEmulator() call needed - it's automatic
  }
  return adminDbCache;
}
