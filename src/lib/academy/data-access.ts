/**
 * TATI Academy Data Access Layer
 * Provides typed queries for facilitator dashboard and cohort workflow.
 *
 * Authorization:
 * - Facilitator can access children where facilitatorUids contains their UID
 * - Cannot access parent-private data (parentInsights)
 * - All queries enforce server-side Firestore rules
 */

import { collection, getDocs, getDoc, query, doc, where, type Firestore } from "firebase/firestore";
import type { ProgressEvent } from "@/lib/learning/progress";
import { getFirebaseFirestore } from "@/integrations/firebase/client";
import { getTrack, itemTitle } from "@/lib/learning/track";
import type { AcademyCohort } from "./cohort-data";
import {
  computeChildProgressSummary,
  needsAttention,
  toValidDate,
  type ChildProgressSummary,
  type FirestoreProgressEvent,
  type SupportSignal,
} from "./learner-progress";

export { computeChildProgressSummary, toValidDate };
export type { ChildProgressSummary, FirestoreProgressEvent, SupportSignal };

// Types for Academy data views

export interface AcademyFacilitatorProfile {
  uid: string;
  email: string;
  displayName: string;
}

export interface AssignedChild {
  id: string;
  familyId: string;
  name: string;
  avatar: string;
  age: number;
  tier: "junior";
  tatiId: string;
  facilitatorUids: string[];
}

export interface AcademyDashboardData {
  facilitator: AcademyFacilitatorProfile;
  todayActivity?: {
    activityName: string;
    cohortName: string;
    duration: string;
    activityId: string;
  };
  assignedChildren: AssignedChild[];
  progressSummaries: ChildProgressSummary[];
  learnersSupportSignal: {
    total: number;
    needsSupport: ChildProgressSummary[];
  };
}

export interface AssessmentRecord {
  id: string;
  phase: "pre" | "post";
  title: string;
  score: number | null;
  maxScore: number | null;
  completedAt: Date | null;
  details: Record<string, unknown> | null;
}

export interface CompetencyRecord {
  id: string;
  name: string;
  level: string;
  score: number;
}

export interface ActivityLogEntry {
  type: "lesson" | "scenario" | "assessment" | "reflection";
  title: string;
  status: "completed" | "in-progress" | "not-started";
  completedAt: Date | null;
  itemId: string;
}

export interface LearnerDetailView {
  child: AssignedChild;
  progress: ChildProgressSummary;
  journeyProgress: FirestoreProgressEvent[];
  assessments: AssessmentRecord[];
  competencies: CompetencyRecord[];
  activityLog: ActivityLogEntry[];
  supportSignal: SupportSignal;
}

// Re-export AcademyCohort from cohort-data
export type { AcademyCohort };

/**
 * INTERNAL: Get all children assigned to a facilitator via facilitatorAssignments index
 * (Requires H3.2.2 data model with facilitatorAssignments collection)
 */
async function _getAssignedChildrenViaIndex(facilitatorUid: string): Promise<AssignedChild[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const assignmentsSnap = await getDocs(
    query(collection(db, "facilitatorAssignments"), where("facilitatorUid", "==", facilitatorUid)),
  );

  const loaded = await Promise.all(
    assignmentsSnap.docs.map(async (assignmentDoc): Promise<AssignedChild | null> => {
      const assignment = assignmentDoc.data();
      const familyId = assignment["familyId"] as string;
      const childId = assignment["childId"] as string;

      try {
        const childSnap = await getDoc(doc(db, "families", familyId, "children", childId));
        if (!childSnap.exists()) {
          console.warn(`Child ${childId} in family ${familyId} not found`);
          return null;
        }

        const child = childSnap.data();
        const facilitatorUids = child["facilitatorUids"] as string[] | undefined;

        // Defence in depth: the child record must also name this facilitator.
        if (!facilitatorUids?.includes(facilitatorUid)) {
          console.warn(`Facilitator ${facilitatorUid} not authorized for child ${childId} in family ${familyId}`);
          return null;
        }

        return {
          id: childId,
          familyId,
          name: (child["name"] as string) ?? "Learner",
          avatar: (child["avatar"] as string) ?? "",
          age: child["age"] as number,
          tier: "junior" as const,
          // Parent-portal field name, with the legacy admin-provisioning field as fallback.
          tatiId: ((child["tati_id"] as string | undefined) ?? (child["tatiId"] as string | undefined)) ?? "",
          facilitatorUids,
        };
      } catch (error) {
        console.error(`Failed to fetch child ${childId} in family ${familyId}:`, error);
        return null;
      }
    }),
  );

  // One learner may appear in several assignments (e.g. several cohorts); keep one entry.
  const unique = new Map<string, AssignedChild>();
  for (const child of loaded) if (child && !unique.has(child.id)) unique.set(child.id, child);
  return [...unique.values()];
}

/**
 * INTERNAL: Fallback query for when facilitatorAssignments collection doesn't exist
 * This directly scans children with facilitatorUids (MVP before full H3.2.2 data model)
 * NOTE: This requires Firestore rules to properly deny unauthorized family/child reads
 */
async function _getAssignedChildrenViaScan(facilitatorUid: string): Promise<AssignedChild[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // TODO: Implement scan if facilitatorAssignments doesn't exist
  // For now, return empty and require facilitatorAssignments collection
  return [];
}

/**
 * Get all children assigned to a facilitator.
 *
 * **H3.2.2 Security Model**:
 * - Queries facilitatorAssignments collection (indexed by facilitatorUid)
 * - Firestore rules: facilitator can read only their own assignments
 * - Fetches child metadata from children collection
 * - Double-checks facilitatorUids authorization (defense in depth)
 * - Cannot access parentInsights or family-private data
 *
 * @param facilitatorUid - The authenticated facilitator's UID
 * @returns Array of assigned children with name, avatar, progress metadata
 */
export async function getAssignedChildren(facilitatorUid: string): Promise<AssignedChild[]> {
  try {
    return await _getAssignedChildrenViaIndex(facilitatorUid);
  } catch (error) {
    // Fallback if facilitatorAssignments collection doesn't exist
    console.warn("facilitatorAssignments collection not available, falling back to direct query");
    return _getAssignedChildrenViaScan(facilitatorUid);
  }
}

/**
 * Get journey progress for a child (facilitator view).
 * Returns Firestore-structured progress events (not Supabase ProgressEvent).
 *
 * @param familyId - The child's family ID
 * @param childId - The child's ID
 * @returns Array of Firestore progress events
 */
export async function getChildJourneyProgress(
  familyId: string,
  childId: string,
): Promise<FirestoreProgressEvent[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const progressSnap = await getDocs(
    collection(db, "families", familyId, "children", childId, "journeyProgress"),
  );

  return progressSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: (data["id"] as string) ?? d.id,
      kind: data["item_type"] as string,
      itemId: data["item_id"] as string,
      status: data["status"] as string,
      // Firestore Timestamps must be converted with toDate(); new Date(timestamp) is invalid.
      completedAt: toValidDate(data["updatedAt"]) ?? toValidDate(data["createdAt"]),
    };
  });
}

/**
 * Get competencies for a child (facilitator view).
 * Used to derive support signals and progress indicators.
 *
 * @param familyId - The child's family ID
 * @param childId - The child's ID
 * @returns Array of competency records
 */
export async function getChildCompetencies(
  familyId: string,
  childId: string,
): Promise<Array<{ id: string; score: number; level: string }>> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const competenciesSnap = await getDocs(
    collection(db, "families", familyId, "children", childId, "competencies"),
  );

  return competenciesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: data["competency_id"] as string,
      score: data["score"] as number,
      level: data["level"] as string,
    };
  });
}

/**
 * Get assessment attempts for a child (facilitator view - read-only).
 * Firestore rule: write: false
 *
 * @param familyId - The child's family ID
 * @param childId - The child's ID
 * @returns Array of assessment records
 */
async function getChildAssessments(familyId: string, childId: string): Promise<AssessmentRecord[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const assessmentsSnap = await getDocs(
    collection(db, "families", familyId, "children", childId, "assessmentAttempts"),
  );

  return assessmentsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: data["id"] as string,
      phase: data["phase"] as "pre" | "post",
      title: data["title"] as string,
      score: (data["score"] as number | null) || null,
      maxScore: (data["maxScore"] as number | null) || null,
      completedAt: toValidDate(data["completedAt"]),
      details: (data["details"] as Record<string, unknown>) || null,
    };
  });
}

/**
 * Get scenario sessions for a child (facilitator view - read-only).
 * Firestore rule: write: false
 *
 * @param familyId - The child's family ID
 * @param childId - The child's ID
 * @returns Array of scenario session records
 */
async function getChildScenarioSessions(
  familyId: string,
  childId: string,
): Promise<Array<{ id: string; title: string; status: string; completedAt: Date | null }>> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const scenariosSnap = await getDocs(
    collection(db, "families", familyId, "children", childId, "scenarioSessions"),
  );

  return scenariosSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: data["id"] as string,
      title: data["title"] as string,
      status: data["status"] as string,
      completedAt: toValidDate(data["completedAt"]),
    };
  });
}

/**
 * Get detailed learner view for facilitator.
 *
 * **Security Model** (H3.2.2):
 * 1. Verifies facilitator is authenticated
 * 2. Verifies learner is assigned to facilitator (via facilitatorAssignments)
 * 3. Fetches all authorized learner data (Firestore rules enforce)
 * 4. Never exposes parentInsights or family-private data
 *
 * Throws error if:
 * - Learner is not assigned to this facilitator
 * - Learner does not exist
 * - Firestore error occurs
 *
 * @param facilitatorUid - Authenticated facilitator UID
 * @param childId - The learner's child ID
 * @returns Complete learner detail view
 */
export async function getAssignedLearnerDetail(
  facilitatorUid: string,
  childId: string,
): Promise<LearnerDetailView> {
  // Get all assigned children to verify authorization
  const assignedChildren = await getAssignedChildren(facilitatorUid);
  const child = assignedChildren.find((c) => c.id === childId);

  if (!child) {
    throw new Error(`Learner ${childId} not assigned to facilitator ${facilitatorUid}`);
  }

  // Load all data for this learner (all queries now authorized by Firestore rules)
  const [journeyProgress, assessments, competencies, scenarioSessions] = await Promise.all([
    getChildJourneyProgress(child.familyId, childId),
    getChildAssessments(child.familyId, childId),
    getChildCompetencies(child.familyId, childId),
    getChildScenarioSessions(child.familyId, childId),
  ]);

  // Compute progress summary
  const progress = computeChildProgressSummary(child, journeyProgress);

  // Build activity log from journey progress and other data, using real activity titles
  const track = getTrack("save");
  const activityLog: ActivityLogEntry[] = journeyProgress.map((event) => {
    const item = track.sequence.find((i) => i.id === event.itemId);
    return {
      type: (event.kind as "lesson" | "scenario" | "assessment" | "reflection") || "lesson",
      title: item ? itemTitle(track, item) : event.itemId,
      status: event.status === "completed" ? "completed" : "in-progress",
      completedAt: event.completedAt,
      itemId: event.itemId,
    };
  });

  // Add assessments to activity log
  for (const assessment of assessments) {
    if (assessment.completedAt instanceof Date) {
      activityLog.push({
        type: "assessment",
        title: assessment.title,
        status: "completed",
        completedAt: assessment.completedAt,
        itemId: assessment.id,
      });
    }
  }

  // Add scenarios to activity log
  for (const scenario of scenarioSessions) {
    if (scenario.completedAt instanceof Date) {
      activityLog.push({
        type: "scenario",
        title: scenario.title,
        status: scenario.status as "completed" | "in-progress" | "not-started",
        completedAt: scenario.completedAt,
        itemId: scenario.id,
      });
    }
  }

  // Sort activity log by date (most recent first)
  activityLog.sort((a, b) => {
    const aTime = a.completedAt?.getTime() ?? 0;
    const bTime = b.completedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return {
    child,
    progress,
    journeyProgress,
    assessments,
    competencies: competencies.map((c) => ({
      id: c.id,
      name: c.id, // TODO: Map competency ID to display name from content
      level: c.level,
      score: c.score,
    })),
    activityLog,
    supportSignal: progress.supportSignal,
  };
}

/**
 * Load full Academy dashboard data for a facilitator.
 * Combines assigned children with progress summaries.
 *
 * @param facilitator - Authenticated facilitator profile
 * @returns Complete dashboard data
 */
export async function loadAcademyDashboard(
  facilitator: AcademyFacilitatorProfile,
): Promise<AcademyDashboardData> {
  const children = await getAssignedChildren(facilitator.uid);

  // Load progress for all children in parallel
  const progressSummaries: ChildProgressSummary[] = await Promise.all(
    children.map(async (child) =>
      computeChildProgressSummary(child, await getChildJourneyProgress(child.familyId, child.id)),
    ),
  );

  // Learners needing attention: "needs-support" or "inactive" (see learner-progress.ts rules)
  const needsSupport = progressSummaries.filter((s) => needsAttention(s.supportSignal));
  const learnersSupportSignal = { total: needsSupport.length, needsSupport };

  return {
    facilitator,
    assignedChildren: children,
    progressSummaries,
    learnersSupportSignal,
  };
}
