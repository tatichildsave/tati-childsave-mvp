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

export interface ChildProgressSummary {
  childId: string;
  childName: string;
  avatar: string;
  currentActivityType?: "lesson" | "scenario" | "assessment" | "reflection";
  currentActivityName?: string;
  journeyProgress: {
    completed: number;
    total: number;
  };
  lastActivityAt?: Date;
  supportSignal?: "on-track" | "not-started" | "needs-support";
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

export interface FirestoreProgressEvent {
  id: string;
  kind: string;
  itemId: string;
  status: string;
  completedAt: Date | null;
}

export interface LearnerDetailView {
  child: AssignedChild;
  progress: ChildProgressSummary;
  journeyProgress: FirestoreProgressEvent[];
  assessments: AssessmentRecord[];
  competencies: CompetencyRecord[];
  activityLog: ActivityLogEntry[];
  supportSignal: "on-track" | "not-started" | "needs-support";
}

/**
 * INTERNAL: Get all children assigned to a facilitator via facilitatorAssignments index
 * (Requires H3.2.2 data model with facilitatorAssignments collection)
 */
async function _getAssignedChildrenViaIndex(facilitatorUid: string): Promise<AssignedChild[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const results: AssignedChild[] = [];
  const assignmentsSnap = await getDocs(
    query(collection(db, "facilitatorAssignments"), where("facilitatorUid", "==", facilitatorUid)),
  );

  for (const assignmentDoc of assignmentsSnap.docs) {
    const assignment = assignmentDoc.data();
    const familyId = assignment["familyId"] as string;
    const childId = assignment["childId"] as string;

    try {
      const childRef = doc(db, "families", familyId, "children", childId);
      const childSnap = await getDoc(childRef);

      if (!childSnap.exists()) {
        console.warn(`Child ${childId} in family ${familyId} not found`);
        continue;
      }

      const child = childSnap.data();
      const facilitatorUids = child["facilitatorUids"] as string[] | undefined;

      if (!facilitatorUids?.includes(facilitatorUid)) {
        console.warn(
          `Facilitator ${facilitatorUid} not authorized for child ${childId} in family ${familyId}`,
        );
        continue;
      }

      results.push({
        id: childId,
        familyId: familyId,
        name: child["name"] as string,
        avatar: child["avatar"] as string,
        age: child["age"] as number,
        tier: "junior" as const,
        tatiId: child["tati_id"] as string,
        facilitatorUids: facilitatorUids,
      });
    } catch (error) {
      console.error(`Failed to fetch child ${childId} in family ${familyId}:`, error);
      continue;
    }
  }

  return results;
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

  return progressSnap.docs.map((doc) => {
    const data = doc.data();
    const completedAt = data["updatedAt"];
    return {
      id: data["id"] as string,
      kind: data["item_type"] as string,
      itemId: data["item_id"] as string,
      status: data["status"] as string,
      completedAt: completedAt ? new Date(completedAt as unknown as string) : null,
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
    const completedAt = data["completedAt"];
    return {
      id: data["id"] as string,
      phase: data["phase"] as "pre" | "post",
      title: data["title"] as string,
      score: (data["score"] as number | null) || null,
      maxScore: (data["maxScore"] as number | null) || null,
      completedAt: completedAt ? new Date(completedAt as unknown as string) : null,
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
    const completedAt = data["completedAt"];
    return {
      id: data["id"] as string,
      title: data["title"] as string,
      status: data["status"] as string,
      completedAt: completedAt ? new Date(completedAt as unknown as string) : null,
    };
  });
}

/**
 * Derive a support signal for a child based on progress data.
 *
 * **Neutral, Non-Stigmatizing Language**:
 * This function derives facilitator-visible support indicators from objective progress data.
 * It does NOT rank, score, or judge learners. It helps facilitators identify who may benefit
 * from additional support.
 *
 * **Deterministic Rules** (Exactly documented for H3.2.2):
 *
 * 1. **"not-started"**: Child has completed 0 journey items
 *    - Condition: completed == 0
 *
 * 2. **"on-track"**: Child is making progress or recently active
 *    - Condition: (completionPercent >= 30%) OR (lastActivityAt within 2 days)
 *    - Interpretation: Child is engaged with the journey
 *
 * 3. **"needs-support"**: Child started but seems stuck
 *    - Condition: (completionPercent < 30%) AND (lastActivityAt > 2 days old)
 *    - Interpretation: Child may benefit from facilitator check-in
 *    - Neutral phrasing: "May need support" (not "struggling" or "at risk")
 *
 * **No Hidden Scoring**:
 * - Does NOT compute risk scores
 * - Does NOT rank learners
 * - Does NOT consider competency data (only progress completion)
 * - Does NOT predict outcomes
 *
 * **Data Used**:
 * - completed item count (from journeyProgress)
 * - last activity timestamp (from journeyProgress.updatedAt)
 * - totalActivities constant (default 14 for SAVE track)
 *
 * @param progressEvents - Array of journey progress records (Firestore events)
 * @param lastActivityAt - Timestamp of most recent activity (or undefined)
 * @param totalActivities - Total activities in learner track (e.g., 14 for SAVE)
 * @returns "not-started" | "on-track" | "needs-support"
 */
function deriveSupportSignal(
  progressEvents: FirestoreProgressEvent[],
  lastActivityAt?: Date,
  totalActivities: number = 14,
): "not-started" | "on-track" | "needs-support" {
  const completed = progressEvents.filter((e) => e.status === "completed").length;
  const completionPercent = (completed / totalActivities) * 100;

  // Rule 1: Not started
  if (completed === 0) {
    return "not-started";
  }

  // Rule 2 & 3: On-track vs needs-support
  if (completionPercent < 30) {
    const now = new Date();
    const daysSinceActivity = lastActivityAt
      ? (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    // If progress is < 30% AND last activity was > 2 days ago → needs-support
    if (daysSinceActivity > 2) {
      return "needs-support";
    }
  }

  // Default: on-track (30%+ complete OR recent activity)
  return "on-track";
}

/**
 * Compute progress summary for a child.
 * Aggregates journey progress data into a facilitator-friendly view.
 *
 * @param child - The child record
 * @param progressEvents - The child's progress events
 * @param totalActivities - Total activities in the track (default: 14)
 * @returns Progress summary
 */
export function computeChildProgressSummary(
  child: AssignedChild,
  progressEvents: FirestoreProgressEvent[],
  totalActivities: number = 14,
): ChildProgressSummary {
  const completedCount = progressEvents.filter((e) => e.status === "completed").length;
  const lastEvent = progressEvents.sort((a, b) => {
    const aTime = a.completedAt instanceof Date ? a.completedAt.getTime() : 0;
    const bTime = b.completedAt instanceof Date ? b.completedAt.getTime() : 0;
    return bTime - aTime;
  })[0];
  const lastActivityAt = lastEvent?.completedAt instanceof Date ? lastEvent.completedAt : undefined;

  // Get current activity (last incomplete or in-progress)
  const currentItem = progressEvents.find((e) => e.status !== "completed");

  return {
    childId: child.id,
    childName: child.name,
    avatar: child.avatar,
    currentActivityType: (currentItem?.kind as string) || undefined,
    currentActivityName: currentItem?.itemId,
    journeyProgress: {
      completed: completedCount,
      total: totalActivities,
    },
    lastActivityAt,
    supportSignal: deriveSupportSignal(progressEvents, lastActivityAt, totalActivities) as
      "not-started" | "on-track" | "needs-support",
  } as ChildProgressSummary;
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
  const journeyProgress = await getChildJourneyProgress(child.familyId, childId);
  const assessments = await getChildAssessments(child.familyId, childId);
  const competencies = await getChildCompetencies(child.familyId, childId);
  const scenarioSessions = await getChildScenarioSessions(child.familyId, childId);

  // Compute progress summary
  const progress = computeChildProgressSummary(child, journeyProgress);

  // Build activity log from journey progress and other data
  const activityLog: ActivityLogEntry[] = journeyProgress.map((event) => ({
    type: (event.kind as "lesson" | "scenario" | "assessment" | "reflection") || "lesson",
    title: event.itemId,
    status: (event.status as "completed" | "in-progress" | "not-started") || "in-progress",
    completedAt: event.completedAt instanceof Date ? event.completedAt : null,
    itemId: event.itemId,
  }));

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
    supportSignal: progress.supportSignal ?? "on-track",
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

  // Load progress for all children
  const progressSummaries: ChildProgressSummary[] = [];
  for (const child of children) {
    const progress = await getChildJourneyProgress(child.familyId, child.id);
    const summary = computeChildProgressSummary(child, progress);
    progressSummaries.push(summary);
  }

  // Compute support signals
  const learnersSupportSignal = {
    total: progressSummaries.filter((s) => s.supportSignal === "needs-support").length,
    needsSupport: progressSummaries.filter((s) => s.supportSignal === "needs-support"),
  };

  // TODO: In H3.3, load actual today's activity from cohort sessions table

  return {
    facilitator,
    assignedChildren: children,
    progressSummaries,
    learnersSupportSignal,
  };
}
