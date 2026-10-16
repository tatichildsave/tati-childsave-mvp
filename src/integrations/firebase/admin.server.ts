/**
 * Server-side Firebase Admin SDK boundary (Phase G1: Trusted Server Foundation).
 *
 * - Admin SDK must never be imported into client/browser modules.
 * - Admin initialization is lazy and safe for both production and emulator.
 * - Emulator uses environment variables: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.
 * - Production uses credentials from secure deployment secrets.
 * - Never place Admin credentials in VITE_ variables.
 */

import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
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

  console.log("[Firebase] Initialization diagnostics:", {
    hasFIREBASE_PROJECT_ID: !!projectId,
    projectIdValue: projectId,
    hasFIREBASE_SERVICE_ACCOUNT: !!serviceAccountJson,
    isEmulator: isEmulatorMode(),
  });

  if (!projectId && !isEmulatorMode()) {
    throw new Error("FIREBASE_PROJECT_ID env var is required for production Firebase.");
  }

  // Parse service account if provided
  let serviceAccountCredential: ReturnType<typeof cert> | undefined;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      serviceAccountCredential = cert(serviceAccount);
      console.log("[Firebase] Service account initialized for project:", serviceAccount.project_id);
    } catch (error) {
      console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT JSON format: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else if (!isEmulatorMode()) {
    console.warn(
      "[Firebase] No FIREBASE_SERVICE_ACCOUNT provided. Admin SDK will use default credentials.",
    );
  }

  // Initialize app
  const initConfig: Record<string, any> = {
    projectId: projectId || "demo-tati",
  };

  if (serviceAccountCredential) {
    initConfig["credential"] = serviceAccountCredential;
  } else if (!isEmulatorMode()) {
    // Production mode only - use application default
    try {
      initConfig["credential"] = applicationDefault();
    } catch (error) {
      console.warn(
        "[Firebase] Could not get application default credentials:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  // Emulator mode: no credentials needed, Admin SDK uses FIRESTORE_EMULATOR_HOST env var

  console.log("[Firebase] Initializing Admin SDK with project:", initConfig["projectId"]);
  if (isEmulatorMode()) {
    console.log("[Firebase] Running in emulator mode");
    console.log("[Firebase] FIRESTORE_EMULATOR_HOST:", process.env["FIRESTORE_EMULATOR_HOST"]);
    console.log(
      "[Firebase] FIREBASE_AUTH_EMULATOR_HOST:",
      process.env["FIREBASE_AUTH_EMULATOR_HOST"],
    );
  }

  adminApp = initializeApp(initConfig);
  console.log("[Firebase] Admin SDK app initialized");

  // Verify project configuration matches environment intent
  verifyProjectConfiguration(initConfig["projectId"]);

  return adminApp;
}

/**
 * Fail-closed environment check: Verify Firebase project configuration
 * in production to prevent accidental data loss. For MVP, no separate test project required.
 */
function verifyProjectConfiguration(projectId: string | undefined) {
  const isEmulator = isEmulatorMode();
  const vercelEnv = process.env["VERCEL_ENV"] || process.env["NODE_ENV"] || "local";
  
  // In emulator mode, skip checks (allows flexible testing)
  if (isEmulator) {
    console.log(
      `[Firebase] Emulator mode active; skipping environment checks (project: ${projectId})`,
    );
    return;
  }

  // Production environment must use production project (fail-closed protection)
  if (vercelEnv === "production") {
    if (projectId !== "tatichildsavemvp") {
      throw new Error(
        `[FAIL-CLOSED] Production environment detected but FIREBASE_PROJECT_ID is "${projectId}". ` +
        `Production MUST use "tatichildsavemvp" project. Aborting to prevent data loss. ` +
        `Check environment variables in Vercel Production settings.`,
      );
    }
    console.log("[Firebase] Production environment verified with correct project: tatichildsavemvp");
  }

  // Preview deployments can use any project; just log for monitoring
  if (vercelEnv === "preview") {
    console.log(`[Firebase] Preview environment using project: ${projectId}. ` +
      `Ensure credentials match the intended test/preview project.`);
  }

  // Local development is flexible
  if (vercelEnv === "local" || vercelEnv === "development") {
    console.log(`[Firebase] Local development with project: ${projectId}`);
  }
}

/**
 * Get Firebase Admin Auth instance.
 * Safe for use in server-only contexts.
 * Automatically connects to Auth emulator if FIREBASE_AUTH_EMULATOR_HOST is set.
 * Throws if initialization fails.
 */
export function getFirebaseAdmin(): Auth {
  if (!adminAuthCache) {
    try {
      const app = initializeAdminApp();
      if (!app) {
        throw new Error("Failed to initialize Firebase Admin app: app is null");
      }
      adminAuthCache = getAuth(app);
      console.log("[Firebase] Admin Auth instance created successfully");
    } catch (error) {
      console.error("[Firebase] CRITICAL: Failed to initialize Admin Auth", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
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
