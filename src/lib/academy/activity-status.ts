/**
 * TATI Academy Activity Status Utility
 *
 * Determines learner status for a specific activity during session monitoring.
 * This is a READ-ONLY utility that categorizes learners by their progress on one activity.
 *
 * Status categories:
 * - "not-started": Learner has not begun this activity
 * - "in-progress": Learner is currently working on this activity
 * - "completed": Learner has finished this activity
 * - "on-another-activity": Learner has moved past this activity in their journey
 *
 * No writes, no modifications, no session records created.
 */

import type { ChildProgressSummary } from "./data-access";
import type { FirestoreProgressEvent } from "./data-access";

export type ActivityStatusType =
  "not-started" | "in-progress" | "completed" | "on-another-activity";

export interface LearnerActivityStatus {
  learner: ChildProgressSummary;
  activityId: string;
  status: ActivityStatusType;
  statusReason?: string | undefined;
  completedAt?: Date | undefined;
}

/**
 * Determine if a learner has started, is working on, or completed a specific activity.
 *
 * **Logic:**
 * 1. If learner's current activity is this activityId:
 *    - status = "in-progress" (unless already marked completed)
 *
 * 2. If activity not in journey progress:
 *    - status = "not-started"
 *
 * 3. If activity in journey progress:
 *    - If status === "completed": return "completed"
 *    - Else: "on-another-activity" (learner started but moved on)
 *
 * **No Writes:** This function is read-only. It only examines existing progress data.
 *
 * @param learner - ChildProgressSummary for this learner
 * @param activityId - The activity ID to check status for
 * @param journeyProgress - The learner's journey progress events
 * @returns LearnerActivityStatus with status and optional reason/completedAt
 */
export function getActivityStatus(
  learner: ChildProgressSummary,
  activityId: string,
  journeyProgress: FirestoreProgressEvent[],
): LearnerActivityStatus {
  // Check if learner is currently working on this activity
  if (learner.currentActivityName === activityId) {
    const event = journeyProgress.find((e) => e.itemId === activityId);
    if (event?.status === "completed") {
      return {
        learner,
        activityId,
        status: "completed",
        statusReason: "Completed this activity",
        completedAt: event.completedAt instanceof Date ? event.completedAt : undefined,
      };
    }
    return {
      learner,
      activityId,
      status: "in-progress",
      statusReason: "Currently working on this activity",
    };
  }

  // Check if activity exists in learner's progress
  const event = journeyProgress.find((e) => e.itemId === activityId);
  if (!event) {
    return {
      learner,
      activityId,
      status: "not-started",
      statusReason: "Has not started this activity yet",
    };
  }

  // Activity exists in progress
  if (event.status === "completed") {
    return {
      learner,
      activityId,
      status: "completed",
      statusReason: "Completed this activity",
      completedAt: event.completedAt instanceof Date ? event.completedAt : undefined,
    };
  }

  // Activity started but learner moved on (current activity is something else)
  return {
    learner,
    activityId,
    status: "on-another-activity",
    statusReason: `Currently working on: ${learner.currentActivityName}`,
  };
}

/**
 * Compute summary counts for all learners' statuses on a specific activity.
 *
 * @param statuses - Array of LearnerActivityStatus
 * @returns Object with counts for each status type
 */
export interface ActivityStatusSummary {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  onAnotherActivity: number;
}

export function summarizeActivityStatuses(
  statuses: LearnerActivityStatus[],
): ActivityStatusSummary {
  return {
    total: statuses.length,
    notStarted: statuses.filter((s) => s.status === "not-started").length,
    inProgress: statuses.filter((s) => s.status === "in-progress").length,
    completed: statuses.filter((s) => s.status === "completed").length,
    onAnotherActivity: statuses.filter((s) => s.status === "on-another-activity").length,
  };
}
