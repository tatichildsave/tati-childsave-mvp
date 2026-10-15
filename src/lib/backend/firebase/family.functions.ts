/**
 * Server-side family functions for parent portal
 * Uses Firebase repositories to query family and child data
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import {
  getCurrentParentContext,
  createParentSession,
} from "@/lib/backend/firebase/parent-auth.server";
import {
  FirebaseFamilyRepository,
  FirebaseJourneyProgressRepository,
} from "@/lib/backend/firebase/repositories";
import { getUserRoles } from "@/lib/auth/roles.server";
import type { ChildProfile } from "@/lib/family";
import type { ProgressEvent } from "@/lib/learning/progress";
import type { Json } from "@/integrations/supabase/types";

const createChildInput = z.object({
  name: z.string().trim().min(2).max(30),
  age: z.number().int().min(8).max(12),
  avatar: z.string().max(10), // Emoji characters can be multi-byte
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
  .handler(async (data) => {
    try {
      await createParentSession(data.idToken);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log full error context server-side (not exposed to client)
      console.error(
        "[createParentSessionFn] CRITICAL: Session cookie creation failed",
        {
          errorMessage,
          errorType: error?.constructor?.name,
          timestamp: new Date().toISOString(),
        }
      );
      
      // Return safe error message to client (no token/credential exposure)
      throw new Error("Session initialization failed. Please try signing in again.");
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
      const message = error instanceof Error ? error.message : String(error);
      console.error("[getFamilyId] Error:", message);
      throw new Error(`Failed to get family: ${message}`);
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
      const message = error instanceof Error ? error.message : String(error);
      console.error("[getFamilyChildren] Error:", message);
      throw new Error(`Failed to get children: ${message}`);
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
      const message = error instanceof Error ? error.message : String(error);
      console.error("[createChildProfile] Error:", message);
      throw new Error(`Failed to create child: ${message}`);
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
      const message = error instanceof Error ? error.message : String(error);
      console.error("[updateChildProfile] Error:", message);
      throw new Error(`Failed to update child: ${message}`);
    }
  });

/**
 * Verify a child belongs to the parent's family
 * Server derives parent uid from authenticated request context
 */
export const assertChildInFamily = createServerFn({ method: "POST" })
  .validator(
    z.object({
      childId: z.string().min(1),
    }),
  )
  .handler(async ({ data: { childId } }) => {
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      await repo.assertChildAccess(childId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[assertChildInFamily] Error:", message);
      throw new Error(`Failed to verify child access: ${message}`);
    }
  });

/**
 * Get journey progress for a child
 * Used by child learning routes to load progress history
 * Returns a properly serializable array of progress events
 */
export const getChildJourneyProgress = createServerFn({ method: "POST" })
  .validator(z.string().min(1))
  .handler(
    async ({
      data: childId,
    }): Promise<
      Array<{
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
      }>
    > => {
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
        if (!childDoc) {
          console.log("[getChildJourneyProgress] Child doc unexpectedly missing:", childId);
          return [];
        }

        const childData = childDoc.data();
        const familyId = childData["familyId"];

        console.log("[getChildJourneyProgress] Found child:", childId, "family:", familyId);

        // Get journey progress using the repository
        const progressRepo = new FirebaseJourneyProgressRepository(db, familyId);
        const progress = await progressRepo.getProgress(childId);

        console.log(
          "[getChildJourneyProgress] Loaded progress for child:",
          childId,
          "events:",
          progress.length,
        );

        // Return properly typed array for serialization
        return progress.map((event) => ({
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
    },
  );

/**
 * Verify provisioning authorization (admin or provisioner role required)
 * Throws AuthorizationError if user lacks provisioning privileges
 */
function requireProvisioningRole(roles: readonly string[]): void {
  const hasProvisioningRole = roles.includes("admin") || roles.includes("provisioner");
  if (!hasProvisioningRole) {
    throw new Error("Provisioning requires admin or provisioner role");
  }
}

/**
 * Provision a family for the authenticated parent
 *
 * Responsibilities:
 * - Require authenticated parent context
 * - Verify parent has provisioning role (admin or provisioner)
 * - Create or retrieve parent's family
 * - Return the family ID
 *
 * Authorization: Admin or provisioner role only (parents cannot call)
 */
export const ensureFamilyFn = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async () => {
    try {
      const context = await getCurrentParentContext();
      const roles = await getUserRoles(context.uid);

      // CRITICAL: Verify provisioning authorization
      // Only admins/provisioners can create families
      requireProvisioningRole(roles);

      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, context.uid);
      const familyId = await repo.ensureFamily();
      return familyId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to ensure family: ${message}`);
    }
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
