/**
 * Server-side family functions for parent portal
 * Uses Firebase repositories to query family and child data
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import { FirebaseFamilyRepository, FirebaseJourneyProgressRepository } from "@/lib/backend/firebase/repositories";
import type { ChildProfile } from "@/lib/family";
import type { ProgressEvent } from "@/lib/learning/progress";

const userIdInput = z.string().uuid().or(z.string().min(1));
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
 * Get the family ID for the authenticated parent
 */
export const getFamilyId = createServerFn({ method: "POST" })
  .validator(userIdInput)
  .handler(async ({ data: userId }) => {
    try {
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, userId);
      const familyId = await repo.ensureFamily();
      console.log("[getFamilyId] Success for user:", userId, "family:", familyId);
      return familyId;
    } catch (error) {
      console.error("[getFamilyId] Error for user:", userId, error);
      throw error;
    }
  });

/**
 * Get all children in the parent's family
 */
export const getFamilyChildren = createServerFn({ method: "POST" })
  .validator(userIdInput)
  .handler(async ({ data: userId }) => {
    const db = getFirebaseAdminDb();
    const repo = new FirebaseFamilyRepository(db, userId);
    return repo.getFamilyChildren();
  });

/**
 * Create a new child profile in the parent's family
 */
export const createChildProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: userIdInput,
      input: createChildInput,
    }),
  )
  .handler(async ({ data: { userId, input } }) => {
    const db = getFirebaseAdminDb();
    const repo = new FirebaseFamilyRepository(db, userId);
    return repo.createChild(input);
  });

/**
 * Update a child profile
 */
export const updateChildProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: userIdInput,
      input: updateChildInput,
    }),
  )
  .handler(async ({ data: { userId, input } }) => {
    const db = getFirebaseAdminDb();
    const repo = new FirebaseFamilyRepository(db, userId);
    await repo.updateChild(input.id, input.changes as Partial<ChildProfile>);
  });

/**
 * Verify a child belongs to the parent's family
 */
export const assertChildInFamily = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: userIdInput,
      childId: z.string().min(1),
    }),
  )
  .handler(async ({ data: { userId, childId } }) => {
    const db = getFirebaseAdminDb();
    const repo = new FirebaseFamilyRepository(db, userId);
    await repo.assertChildAccess(childId);
  });

/**
 * Get journey progress for a child
 * Used by child learning routes to load progress history
 */
export const getChildJourneyProgress = createServerFn({ method: "POST" })
  .validator(z.string().min(1))
  .handler(async ({ data: childId }) => {
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
      return progress;
    } catch (error) {
      console.error("[getChildJourneyProgress] Error for child:", childId, error);
      throw error;
    }
  });
