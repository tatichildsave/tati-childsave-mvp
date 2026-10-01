/**
 * Server-side Firebase Admin SDK boundary (Phase G1: Trusted Server Foundation).
 *
 * - Admin SDK must never be imported into client/browser modules.
 * - Admin initialization is lazy and safe for both production and emulator.
 * - Emulator uses environment variables: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.
 * - Production uses credentials from secure deployment secrets.
 * - Never place Admin credentials in VITE_ variables.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import * as admin from "firebase-admin";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const isEmulatorMode = () => !!process.env["FIRESTORE_EMULATOR_HOST"];

let adminApp = getApps()[0];
let adminAuthCache: Auth | null = null;
let adminDbCache: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK app (lazy singleton).
 * Supports both emulator and production modes.
 * When FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST env vars are set,
 * the Admin SDK automatically connects to the local emulator.
 */
function initializeAdminApp() {
  if (adminApp) return adminApp;

  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT"];

  if (!projectId && !isEmulatorMode()) {
    throw new Error("FIREBASE_PROJECT_ID env var is required for production Firebase.");
  }

  // Parse service account if provided
  let serviceAccountCredential: ReturnType<typeof admin.credential.cert> | undefined;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      serviceAccountCredential = admin.credential.cert(serviceAccount);
      console.log("[Firebase] Service account initialized for project:", serviceAccount.project_id);
    } catch (error) {
      console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT JSON format: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (!isEmulatorMode()) {
    console.warn("[Firebase] No FIREBASE_SERVICE_ACCOUNT provided. Admin SDK will use default credentials.");
  }

  // Initialize app
  const initConfig: Record<string, any> = {
    projectId: projectId || "demo-tati",
  };

  if (serviceAccountCredential) {
    initConfig.credential = serviceAccountCredential;
  } else if (!isEmulatorMode()) {
    // Production mode only - use application default
    try {
      initConfig.credential = admin.credential.applicationDefault();
    } catch (error) {
      console.warn("[Firebase] Could not get application default credentials:", error instanceof Error ? error.message : error);
    }
  }
  // Emulator mode: no credentials needed, Admin SDK uses FIRESTORE_EMULATOR_HOST env var

  console.log("[Firebase] Initializing Admin SDK with project:", initConfig.projectId);
  if (isEmulatorMode()) {
    console.log("[Firebase] Running in emulator mode");
    console.log("[Firebase] FIRESTORE_EMULATOR_HOST:", process.env["FIRESTORE_EMULATOR_HOST"]);
    console.log("[Firebase] FIREBASE_AUTH_EMULATOR_HOST:", process.env["FIREBASE_AUTH_EMULATOR_HOST"]);
  }
  
  adminApp = initializeApp(initConfig);
  console.log("[Firebase] Admin SDK app initialized");

  return adminApp;
}

/**
 * Get Firebase Admin Auth instance.
 * Safe for use in server-only contexts.
 * Automatically connects to Auth emulator if FIREBASE_AUTH_EMULATOR_HOST is set.
 */
export function getFirebaseAdmin(): Auth {
  if (!adminAuthCache) {
    adminAuthCache = getAuth(initializeAdminApp());
  }
  return adminAuthCache;
}

/**
 * Get Firebase Admin Auth instance.
 * Safe for use in server-only contexts.
 * Automatically connects to Auth emulator if FIREBASE_AUTH_EMULATOR_HOST is set.
 */
export function getFirebaseAdminAuth(): Auth {
  if (!adminAuthCache) {
    adminAuthCache = getAuth(initializeAdminApp());
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
    console.log("[Firebase] Firestore instance obtained from Admin SDK");
  }
  return adminDbCache;
}
