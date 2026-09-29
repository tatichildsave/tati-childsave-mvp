/**
 * Server-side family functions for parent portal
 * Uses Firebase repositories to query family and child data
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import { FirebaseFamilyRepository } from "@/lib/backend/firebase/repositories";
import type { ChildProfile } from "@/lib/family";

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
    const db = getFirebaseAdminDb();
    const repo = new FirebaseFamilyRepository(db, userId);
    return repo.ensureFamily();
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
