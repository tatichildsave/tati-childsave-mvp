/** Deterministic facilitatorAssignments document id: one assignment per facilitator + child. */
export function assignmentId(facilitatorUid: string, childId: string): string {
  return `${facilitatorUid}__${childId}`;
}
