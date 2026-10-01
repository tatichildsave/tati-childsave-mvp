/**
 * Server-side family functions for parent portal
 * Uses Firebase repositories to query family and child data
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import { getCurrentParentContext, createParentSession } from "@/lib/backend/firebase/parent-auth.server";
import { FirebaseFamilyRepository, FirebaseJourneyProgressRepository } from "@/lib/backend/firebase/repositories";
import type { ChildProfile } from "@/lib/family";
import type { ProgressEvent } from "@/lib/learning/progress";
import type { Json } from "@/integrations/supabase/types";


const createChildInput = z.object({
  name: z.string().trim().min(2).max(30),
  age: z.number().int().min(8).max(12),
  avatar: z.string().max(2),
  onboardingCompleted: z.boolean().optional(),
});
const updateChildInput = z.object({
  id: z.string().min(1),
  changes: z.record(z.unknown()),
});

/**
 * Create a parent session from a Firebase ID token
 * Called immediately after sign-in/signup with a fresh ID token
 * Sets an HTTP-only session cookie that server functions use for authentication
 */
export const createParentSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ idToken: z.string().min(1) }))
  .handler(async ({ data: { idToken } }) => {
    console.log("[createParentSessionFn] CALLED with idToken:", idToken.substring(0, 50) + "...");
    try {
      console.log("[createParentSessionFn] Calling createParentSession...");
      await createParentSession(idToken);
      console.log("[createParentSessionFn] SUCCESS - session cookie created");
      return { success: true };
    } catch (error) {
      console.error("[createParentSessionFn] Error:", error);
      // Throw a plain Error, not the original error which may contain unserializable objects
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create session: ${message}`);
    }
  });

/**
 * Get the family ID for the authenticated parent
 * Creates it on first use (idempotent)
 * Server derives parent uid from authenticated request context
 */
export const getFamilyId = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async () => {
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      const familyId = await repo.ensureFamily();
      return familyId;
    } catch (error) {
      console.error("[getFamilyId] Error:", error);
      throw error;
    }
  });

/**
 * Get all children in the parent's family
 * Server derives parent uid from authenticated request context
 */
export const getFamilyChildren = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async () => {
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      const children = await repo.getFamilyChildren();
      return children;
    } catch (error) {
      console.error("[getFamilyChildren] Error:", error);
      throw error;
    }
  });

/**
 * Create a new child profile in the parent's family
 * Server derives parent uid from authenticated request context
 */
export const createChildProfile = createServerFn({ method: "POST" })
  .validator(createChildInput)
  .handler(async ({ data: input }) => {
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      const child = await repo.createChild(input);
      return child;
    } catch (error) {
      console.error("[createChildProfile] Error:", error);
      throw error;
    }
  });

/**
 * Update a child profile
 * Server derives parent uid from authenticated request context
 */
export const updateChildProfile = createServerFn({ method: "POST" })
  .validator(updateChildInput)
  .handler(async ({ data: input }) => {
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      
      // Verify child belongs to parent's family
      await repo.assertChildAccess(input.id);
      
      // Update the child
      await repo.updateChild(input.id, input.changes as Partial<ChildProfile>);
    } catch (error) {
      console.error("[updateChildProfile] Error:", error);
      throw error;
    }
  });

/**
 * Verify a child belongs to the parent's family
 * Server derives parent uid from authenticated request context
 */
export const assertChildInFamily = createServerFn({ method: "POST" })
  .validator(z.object({
    childId: z.string().min(1),
  }))
  .handler(async ({ data: { childId } }) => {
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      await repo.assertChildAccess(childId);
    } catch (error) {
      console.error("[assertChildInFamily] Error:", error);
      throw error;
    }
  });

/**
 * Get journey progress for a child
 * Used by child learning routes to load progress history
 * Returns a properly serializable array of progress events
 */
export const getChildJourneyProgress = createServerFn({ method: "POST" })
  .validator(z.string().min(1))
  .handler(async ({ data: childId }): Promise<Array<{
    id: string;
    track_id: string;
    item_type: string;
    item_id: string;
    status: string;
    score: number | null;
    max_score: number | null;
    details: Json;
    created_at: string;
    updated_at: string;
  }>> => {
    try {
      const db = getFirebaseAdminDb();
      
      // Get the child document to find their family
      const familyDocs = await db
        .collectionGroup("children")
        .where("id", "==", childId)
        .limit(1)
        .get();
      
      if (familyDocs.empty) {
        console.log("[getChildJourneyProgress] Child not found:", childId);
        return [];
      }
      
      const childDoc = familyDocs.docs[0];
      const childData = childDoc.data();
      const familyId = childData.familyId;
      
      console.log("[getChildJourneyProgress] Found child:", childId, "family:", familyId);
      
      // Get journey progress using the repository
      const progressRepo = new FirebaseJourneyProgressRepository(db, familyId);
      const progress = await progressRepo.getProgress(childId);
      
      console.log("[getChildJourneyProgress] Loaded progress for child:", childId, "events:", progress.length);
      
      // Return properly typed array for serialization
      return progress.map(event => ({
        id: event.id,
        track_id: event.track_id,
        item_type: event.item_type,
        item_id: event.item_id,
        status: event.status,
        score: event.score,
        max_score: event.max_score,
        details: event.details as Json,
        created_at: event.created_at,
        updated_at: event.updated_at,
      }));
    } catch (error) {
      console.error("[getChildJourneyProgress] Error for child:", childId, error);
      throw error;
    }
  });



/**
 * DIAGNOSTIC FUNCTION - Test Admin SDK connectivity
 * Step 1: Verify env vars reach the server
 * Step 2: Write a test document
 * Step 3: Read it back
 * Returns full diagnostic report
 */
// TEMPORARY: Diagnostic function (remove after debugging complete)
export const testAdminSdkDiagnostics = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async () => {
    const report: Record<string, any> = {};
    
    try {
      // Log what we see at server runtime
      report.env_vars = {
        FIRESTORE_EMULATOR_HOST: process.env["FIRESTORE_EMULATOR_HOST"],
        FIREBASE_AUTH_EMULATOR_HOST: process.env["FIREBASE_AUTH_EMULATOR_HOST"],
        FIREBASE_PROJECT_ID: process.env["FIREBASE_PROJECT_ID"],
        NODE_ENV: process.env["NODE_ENV"],
      };
      
      console.log("[testAdminSdkDiagnostics] Environment variables:", report.env_vars);
      
      // Get the DB instance
      const db = getFirebaseAdminDb();
      report.db_obtained = true;
      console.log("[testAdminSdkDiagnostics] Successfully obtained Firestore instance");
      
      // Try to write a test document
      const testDocId = `test-${Date.now()}`;
      const testPath = `test-diagnostics/${testDocId}`;
      await db.doc(testPath).set({
        timestamp: new Date().toISOString(),
        projectId: process.env["FIREBASE_PROJECT_ID"],
        written_at: Date.now(),
      });
      report.write_test = { status: "success", path: testPath, docId: testDocId };
      console.log("[testAdminSdkDiagnostics] Successfully wrote test document to:", testPath);
      
      // Try to read it back
      const readResult = await db.doc(testPath).get();
      if (readResult.exists) {
        report.read_test = { status: "success", data: readResult.data() };
        console.log("[testAdminSdkDiagnostics] Successfully read test document:", readResult.data());
      } else {
        report.read_test = { status: "failed", reason: "Document does not exist after write" };
        console.error("[testAdminSdkDiagnostics] ERROR: Test document not found after write!");
      }
      
      report.overall_status = "PASS";
      console.log("[testAdminSdkDiagnostics] OVERALL: PASS - Admin SDK is working");
      
    } catch (error) {
      report.overall_status = "FAIL";
      report.error = error instanceof Error ? { message: error.message, stack: error.stack } : String(error);
      console.error("[testAdminSdkDiagnostics] OVERALL: FAIL -", report.error);
    }
    
    return report;
  });

/**
 * Clear parent session and logout
 * Deletes the session cookie and optionally revokes refresh tokens
 */
export const clearParentSessionFn = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async () => {
    try {
      const { uid } = await getCurrentParentContext();
      const { clearParentSession } = await import("@/lib/backend/firebase/parent-auth.server");
      await clearParentSession(uid);
      return { success: true };
    } catch (error) {
      console.error("[clearParentSessionFn] Error:", error);
      throw error;
    }
  });
