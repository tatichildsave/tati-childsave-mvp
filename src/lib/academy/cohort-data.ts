/**
 * TATI Academy Cohort Data Access Layer (H3.2.9)
 *
 * Manages facilitator cohorts - named groups of assigned learners.
 * Cohorts are organizational units that reference learners via facilitatorAssignments.
 * Cohorts do NOT modify learner progress, assignments, or protected data.
 *
 * Authorization:
 * - Facilitator owns the cohorts they create (facilitatorUid is immutable)
 * - Can only manage learners they are authorized to access (via facilitatorAssignments)
 * - All operations enforce Firestore server-side rules
 * - Cannot change ownership, modify immutable fields, or bypass H3.2.2 constraints
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/integrations/firebase/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AcademyCohortStatus = "active" | "archived";

export interface AcademyCohort {
  id: string; // Document ID (Firestore-generated)
  facilitatorUid: string; // Owner (immutable)
  name: string; // Cohort name (mutable, max 100 chars)
  description: string | null; // Optional description (mutable, max 500 chars)
  learnerIds: string[]; // Child IDs assigned to cohort (mutable, only authorized)
  status: AcademyCohortStatus; // "active" or "archived" (mutable)
  createdAt: Timestamp; // Server timestamp (immutable)
  updatedAt: Timestamp; // Updated on mutations
}

export interface CreateCohortInput {
  facilitatorUid: string; // Owner of the cohort
  name: string; // Cohort name (required, non-empty, max 100 chars)
  description?: string | null; // Optional (max 500 chars)
  learnerIds?: string[]; // Initial learner IDs (optional, must be authorized)
}

export interface UpdateCohortInput {
  cohortId: string;
  facilitatorUid: string; // Must be the owner
  name?: string; // Can change
  description?: string | null; // Can change
  learnerIds?: string[]; // Can change (if authorized)
}

export interface ArchiveCohortInput {
  cohortId: string;
  facilitatorUid: string; // Must be the owner
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateCohortName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Cohort name is required");
  }
  if (name.length > 100) {
    throw new Error("Cohort name must be 100 characters or less");
  }
}

function validateCohortDescription(description: string | null | undefined): void {
  if (description !== null && description !== undefined) {
    if (description.length > 500) {
      throw new Error("Cohort description must be 500 characters or less");
    }
  }
}

function validateLearnerIds(learnerIds: string[] | undefined): void {
  if (learnerIds !== undefined) {
    if (!Array.isArray(learnerIds)) {
      throw new Error("Learner IDs must be an array");
    }
    // Check for duplicates
    const uniqueIds = new Set(learnerIds);
    if (uniqueIds.size !== learnerIds.length) {
      throw new Error("Duplicate learner IDs not allowed");
    }
  }
}

// ============================================================================
// FIRESTORE OPERATIONS
// ============================================================================

/**
 * Create a new cohort.
 * Sets all required fields with server timestamps.
 * facilitatorUid is immutable after creation.
 *
 * **Authorization Check:**
 * - Client must verify facilitator ownership
 * - Firestore rules enforce facilitatorUid == request.auth.uid at create
 * - Learner authorization is checked at application level
 *
 * @param input - Cohort creation parameters
 * @returns The created cohort ID
 * @throws If validation fails or Firestore rules reject
 */
export async function createAcademyCohort(input: CreateCohortInput): Promise<string> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Validation
  validateCohortName(input.name);
  validateCohortDescription(input.description);
  validateLearnerIds(input.learnerIds);

  // Generate document ID
  const cohortRef = doc(collection(db, "academyCohorts"));

  // Prepare data
  const cohortData: AcademyCohort = {
    id: cohortRef.id,
    facilitatorUid: input.facilitatorUid,
    name: input.name.trim(),
    description: input.description || null,
    learnerIds: input.learnerIds || [],
    status: "active" as const,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  // Write to Firestore
  // Firestore rules will validate facilitatorUid ownership at server
  await setDoc(cohortRef, cohortData);

  return cohortRef.id;
}

/**
 * Get a single cohort by ID.
 *
 * **Authorization Check:**
 * - Client must verify facilitator ownership before calling
 * - Firestore rules enforce read access at server
 *
 * @param cohortId - The cohort ID
 * @param facilitatorUid - The requesting facilitator's UID (for verification)
 * @returns The cohort, or null if not found or unauthorized
 * @throws If cohort not found (returns null, doesn't throw)
 */
export async function getAcademyCohort(
  cohortId: string,
  facilitatorUid: string,
): Promise<AcademyCohort | null> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const cohortRef = doc(db, "academyCohorts", cohortId);
  const cohortSnap = await getDoc(cohortRef);

  if (!cohortSnap.exists()) {
    return null;
  }

  const cohort = cohortSnap.data() as AcademyCohort;

  // Defense in depth: verify ownership at client
  if (cohort.facilitatorUid !== facilitatorUid) {
    throw new Error(`Unauthorized: cohort belongs to a different facilitator`);
  }

  return cohort;
}

/**
 * Get all cohorts for a facilitator.
 *
 * **Authorization:**
 * - Firestore rules restrict to facilitator's own cohorts
 * - Query filters by facilitatorUid == request.auth.uid
 *
 * @param facilitatorUid - The facilitator's UID
 * @returns Array of cohorts owned by the facilitator
 */
export async function getFacilitatorCohorts(facilitatorUid: string): Promise<AcademyCohort[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const cohortsSnap = await getDocs(
    query(
      collection(db, "academyCohorts"),
      where("facilitatorUid", "==", facilitatorUid),
      orderBy("createdAt", "desc"),
    ),
  );

  return cohortsSnap.docs.map((doc) => doc.data() as AcademyCohort);
}

/**
 * Update a cohort's mutable fields.
 * Immutable fields (facilitatorUid, createdAt) cannot change.
 *
 * **Authorization Check:**
 * - Client must verify facilitator ownership
 * - Firestore rules enforce ownership + immutability at server
 *
 * @param input - Update parameters
 * @throws If cohort not found, unauthorized, or validation fails
 */
export async function updateAcademyCohort(input: UpdateCohortInput): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Fetch current cohort for validation
  const cohortRef = doc(db, "academyCohorts", input.cohortId);
  const cohortSnap = await getDoc(cohortRef);

  if (!cohortSnap.exists()) {
    throw new Error(`Cohort ${input.cohortId} not found`);
  }

  const currentCohort = cohortSnap.data() as AcademyCohort;

  // Authorization: verify ownership
  if (currentCohort.facilitatorUid !== input.facilitatorUid) {
    throw new Error(`Unauthorized: you do not own this cohort`);
  }

  // Validate changes
  if (input.name !== undefined) {
    validateCohortName(input.name);
  }
  if (input.description !== undefined) {
    validateCohortDescription(input.description);
  }
  if (input.learnerIds !== undefined) {
    validateLearnerIds(input.learnerIds);
  }

  // Prepare update data (only include fields that changed)
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.name !== undefined) {
    updateData["name"] = input.name.trim();
  }
  if (input.description !== undefined) {
    updateData["description"] = input.description || null;
  }
  if (input.learnerIds !== undefined) {
    updateData["learnerIds"] = input.learnerIds;
  }

  // Update in Firestore
  // Firestore rules will prevent modification of immutable fields
  await updateDoc(cohortRef, updateData);
}

/**
 * Archive a cohort (set status to "archived").
 * Archiving is the preferred alternative to deletion.
 *
 * **Authorization Check:**
 * - Client must verify facilitator ownership
 * - Firestore rules enforce ownership at server
 *
 * @param input - Archive parameters
 * @throws If cohort not found or unauthorized
 */
export async function archiveAcademyCohort(input: ArchiveCohortInput): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Fetch current cohort for verification
  const cohortRef = doc(db, "academyCohorts", input.cohortId);
  const cohortSnap = await getDoc(cohortRef);

  if (!cohortSnap.exists()) {
    throw new Error(`Cohort ${input.cohortId} not found`);
  }

  const currentCohort = cohortSnap.data() as AcademyCohort;

  // Authorization: verify ownership
  if (currentCohort.facilitatorUid !== input.facilitatorUid) {
    throw new Error(`Unauthorized: you do not own this cohort`);
  }

  // Update status to archived
  await updateDoc(cohortRef, {
    status: "archived" as const,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compute summary statistics for a cohort.
 * Useful for display and UI calculations.
 *
 * @param cohort - The cohort object
 * @returns Statistics object
 */
export function computeCohortSummary(cohort: AcademyCohort) {
  return {
    id: cohort.id,
    name: cohort.name,
    learnerCount: cohort.learnerIds.length,
    status: cohort.status,
    isActive: cohort.status === "active",
    isArchived: cohort.status === "archived",
    createdAt: cohort.createdAt,
    updatedAt: cohort.updatedAt,
  };
}
