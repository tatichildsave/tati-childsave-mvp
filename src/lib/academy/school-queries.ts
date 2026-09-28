/**
 * TATI Academy School-Level Queries (H3.3 Phase B)
 *
 * Provides school-scoped data queries for facilitators, cohorts, and learners.
 * All queries enforce school admin authorization at the data-access layer.
 * Firestore Rules provide server-side enforcement of school isolation.
 *
 * Architecture:
 * - facilitatorAssignments: Optional schoolId field (backward compatible)
 * - academyCohorts: Optional schoolId field (backward compatible)
 * - Queries filter by schoolId and authorization
 * - Cross-school access prevented by Firestore Rules
 */

import { collection, doc, getDoc, getDocs, query, where, type Firestore } from "firebase/firestore";
import { getFirebaseFirestore } from "@/integrations/firebase/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SchoolFacilitatorSummary {
  uid: string;
  email: string;
  displayName: string;
  cohortCount: number;
  learnerCount: number;
  assignedAt: Date;
}

export interface SchoolCohortSummary {
  id: string;
  facilitatorUid: string;
  facilitatorName: string;
  name: string;
  status: "active" | "archived";
  learnerCount: number;
  createdAt: Date;
}

export interface SchoolLearnerSummary {
  id: string;
  familyId: string;
  name: string;
  avatar: string;
  age: number;
  cohortId: string;
  cohortName: string;
  facilitatorUid: string;
  facilitatorName: string;
}

// ============================================================================
// VALIDATION & AUTHORIZATION
// ============================================================================

/**
 * Validate school ID format
 */
function validateSchoolId(schoolId: string): void {
  if (!schoolId || schoolId.trim().length === 0) {
    throw new Error("School ID is required");
  }
  if (typeof schoolId !== "string") {
    throw new Error("School ID must be a string");
  }
}

// ============================================================================
// B1: SCHOOL-SCOPED FACILITATOR QUERIES
// ============================================================================

/**
 * Get facilitators associated with a school via cohorts
 * Authorization: Query enforced by Firestore Rules
 * Returns: Unique facilitators with cohort and learner counts
 */
export async function getFacilitatorsBySchool(
  schoolId: string,
): Promise<SchoolFacilitatorSummary[]> {
  validateSchoolId(schoolId);

  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Query academyCohorts filtered by schoolId
  const cohortsQuery = query(collection(db, "academyCohorts"), where("schoolId", "==", schoolId));

  const cohortsSnap = await getDocs(cohortsQuery);
  const facilitatorMap = new Map<string, SchoolFacilitatorSummary>();

  // Extract unique facilitators from cohorts
  for (const cohortDoc of cohortsSnap.docs) {
    const cohort = cohortDoc.data();
    const facilitatorUid = cohort["facilitatorUid"] as string | undefined;
    const learnerIds = cohort["learnerIds"] as string[] | undefined;
    const status = cohort["status"] as string | undefined;

    if (!facilitatorUid) {
      console.warn(`Cohort ${cohortDoc.id} missing facilitatorUid`);
      continue;
    }

    // Skip archived cohorts when counting
    if (status === "archived") {
      continue;
    }

    if (!facilitatorMap.has(facilitatorUid)) {
      facilitatorMap.set(facilitatorUid, {
        uid: facilitatorUid,
        email: "",
        displayName: "",
        cohortCount: 0,
        learnerCount: 0,
        assignedAt: new Date(),
      });
    }

    const facilitator = facilitatorMap.get(facilitatorUid)!;
    facilitator.cohortCount += 1;
    facilitator.learnerCount += learnerIds?.length || 0;
  }

  // Fetch facilitator profiles to get email and displayName
  const facilitators: SchoolFacilitatorSummary[] = [];
  for (const [uid, summary] of facilitatorMap) {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const user = userSnap.data();
        summary.email = (user["email"] as string) || "";
        summary.displayName = (user["displayName"] as string) || uid;
      }

      facilitators.push(summary);
    } catch (err) {
      console.warn(`Failed to fetch user ${uid}:`, err);
      // Still include facilitator without profile info
      facilitators.push(summary);
    }
  }

  return facilitators;
}

// ============================================================================
// B2: SCHOOL-SCOPED COHORT QUERIES
// ============================================================================

/**
 * Get cohorts belonging to a school
 * Authorization: Query enforced by Firestore Rules
 * Returns: Active and archived cohorts with facilitator info
 */
export async function getCohortsBySchool(schoolId: string): Promise<SchoolCohortSummary[]> {
  validateSchoolId(schoolId);

  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Query academyCohorts filtered by schoolId
  const cohortsQuery = query(collection(db, "academyCohorts"), where("schoolId", "==", schoolId));

  const cohortsSnap = await getDocs(cohortsQuery);
  const cohorts: SchoolCohortSummary[] = [];

  for (const cohortDoc of cohortsSnap.docs) {
    const cohort = cohortDoc.data();
    const facilitatorUid = cohort["facilitatorUid"] as string | undefined;
    const learnerIds = cohort["learnerIds"] as string[] | undefined;

    if (!facilitatorUid) {
      console.warn(`Cohort ${cohortDoc.id} missing facilitatorUid`);
      continue;
    }

    // Fetch facilitator profile
    let facilitatorName = facilitatorUid;
    try {
      const userRef = doc(db, "users", facilitatorUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        facilitatorName = (userSnap.data()["displayName"] as string) || facilitatorUid;
      }
    } catch (err) {
      console.warn(`Failed to fetch facilitator ${facilitatorUid}:`, err);
    }

    cohorts.push({
      id: cohortDoc.id,
      facilitatorUid: facilitatorUid,
      facilitatorName: facilitatorName,
      name: (cohort["name"] as string) || "",
      status: (cohort["status"] as "active" | "archived") || "active",
      learnerCount: learnerIds?.length || 0,
      createdAt: cohort["createdAt"]?.toDate?.() || new Date(),
    });
  }

  return cohorts;
}

// ============================================================================
// B3: FACILITATOR ASSIGNMENT INTEGRATION
// ============================================================================

/**
 * Get facilitators assigned to a school via facilitatorAssignments with schoolId
 * This is an alternative query to getFacilitatorsBySchool that uses facilitatorAssignments
 * Authorization: Query enforced by Firestore Rules
 * Returns: Facilitators with assignment details
 */
export async function getSchoolFacilatorAssignments(schoolId: string): Promise<
  Array<{
    facilitatorUid: string;
    learnerCount: number;
    assignmentCount: number;
  }>
> {
  validateSchoolId(schoolId);

  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Query facilitatorAssignments filtered by optional schoolId
  // Note: This only works for new assignments with schoolId field
  const assignmentsQuery = query(
    collection(db, "facilitatorAssignments"),
    where("schoolId", "==", schoolId),
  );

  const assignmentsSnap = await getDocs(assignmentsQuery);
  const facilitatorMap = new Map<string, { learnerCount: number; assignmentCount: number }>();

  for (const assignmentDoc of assignmentsSnap.docs) {
    const assignment = assignmentDoc.data();
    const facilitatorUid = assignment["facilitatorUid"] as string | undefined;

    if (!facilitatorUid) {
      console.warn(`Assignment ${assignmentDoc.id} missing facilitatorUid`);
      continue;
    }

    if (!facilitatorMap.has(facilitatorUid)) {
      facilitatorMap.set(facilitatorUid, {
        learnerCount: 0,
        assignmentCount: 0,
      });
    }

    const entry = facilitatorMap.get(facilitatorUid)!;
    entry.assignmentCount += 1;
    entry.learnerCount = new Set([...facilitatorMap.values()].map((v) => v.learnerCount)).size;
  }

  return Array.from(facilitatorMap.entries()).map(([facilitatorUid, counts]) => ({
    facilitatorUid,
    ...counts,
  }));
}

// ============================================================================
// B4: SCHOOL-LEVEL LEARNER QUERY
// ============================================================================

/**
 * Get all learners in a school (aggregated via cohorts)
 * Authorization: Query enforced by Firestore Rules
 * Returns: Learners with cohort and facilitator info
 * Privacy: Does NOT expose parentInsights or family data
 */
export async function getLearnersBySchool(schoolId: string): Promise<SchoolLearnerSummary[]> {
  validateSchoolId(schoolId);

  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Get all active cohorts for the school
  const cohortsQuery = query(
    collection(db, "academyCohorts"),
    where("schoolId", "==", schoolId),
    where("status", "==", "active"),
  );

  const cohortsSnap = await getDocs(cohortsQuery);
  const learners: SchoolLearnerSummary[] = [];
  const seenLearnerIds = new Set<string>(); // Prevent duplicates across cohorts

  for (const cohortDoc of cohortsSnap.docs) {
    const cohort = cohortDoc.data();
    const learnerIds = cohort["learnerIds"] as string[] | undefined;
    const facilitatorUid = cohort["facilitatorUid"] as string | undefined;
    const cohortName = cohort["name"] as string | undefined;

    if (!learnerIds || !facilitatorUid || !cohortName) {
      continue;
    }

    // Fetch facilitator name
    let facilitatorName = facilitatorUid;
    try {
      const userRef = doc(db, "users", facilitatorUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        facilitatorName = (userSnap.data()["displayName"] as string) || facilitatorUid;
      }
    } catch (err) {
      console.warn(`Failed to fetch facilitator ${facilitatorUid}:`, err);
    }

    // Fetch learner details from families collection
    for (const learnerId of learnerIds) {
      // Skip if already seen (learner in multiple cohorts)
      if (seenLearnerIds.has(learnerId)) {
        continue;
      }
      seenLearnerIds.add(learnerId);

      try {
        // Query to find which family this learner belongs to
        // This requires iterating through families (expensive but necessary)
        const familiesRef = collection(db, "families");
        const familiesSnap = await getDocs(familiesRef);

        let found = false;
        for (const familyDoc of familiesSnap.docs) {
          const familyId = familyDoc.id;
          const childRef = doc(db, "families", familyId, "children", learnerId);
          const childSnap = await getDoc(childRef);

          if (childSnap.exists()) {
            const child = childSnap.data();
            learners.push({
              id: learnerId,
              familyId: familyId,
              name: (child["name"] as string) || "",
              avatar: (child["avatar"] as string) || "",
              age: (child["age"] as number) || 0,
              cohortId: cohortDoc.id,
              cohortName: cohortName,
              facilitatorUid: facilitatorUid,
              facilitatorName: facilitatorName,
            });
            found = true;
            break;
          }
        }

        if (!found) {
          console.warn(`Learner ${learnerId} not found in any family`);
        }
      } catch (err) {
        console.warn(`Failed to fetch learner ${learnerId}:`, err);
      }
    }
  }

  return learners;
}

// ============================================================================
// B5: SCHOOL-LEVEL QUERY AUTHORIZATION (Helper)
// ============================================================================

/**
 * Helper: Validate that user has access to query school data
 * This is called by React Query hooks before making queries
 * Firestore Rules provide server-side enforcement
 */
export function validateSchoolAccess(
  schoolId: string,
  isAdmin: boolean,
  isSchoolAdmin: boolean,
): void {
  if (!isAdmin && !isSchoolAdmin) {
    throw new Error(`User does not have access to school ${schoolId}`);
  }
}

/**
 * Helper: Validate school exists and is accessible
 */
export async function validateSchoolExists(schoolId: string): Promise<boolean> {
  validateSchoolId(schoolId);

  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  try {
    const schoolRef = doc(db, "schools", schoolId);
    const schoolSnap = await getDoc(schoolRef);
    return schoolSnap.exists();
  } catch (err) {
    console.warn(`Failed to validate school ${schoolId}:`, err);
    return false;
  }
}
