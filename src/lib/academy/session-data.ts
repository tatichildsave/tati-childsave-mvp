/**
 * TATI Academy Session Data Access Layer (H3.2.8)
 *
 * Manages facilitator session persistence.
 * Sessions are observational records of facilitated activities.
 * Sessions do NOT modify learner progress.
 *
 * Authorization:
 * - Facilitator can only create/read/update own sessions
 * - All operations enforce Firestore server-side rules
 * - Learner progress remains immutable
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

export type AcademySessionStatus = "active" | "completed";

export interface AcademySession {
  id: string;
  facilitatorUid: string;
  activityId: string;
  activityKind: "lesson" | "scenario" | "assessment" | "reflection";
  activityTitle: string;
  trackId: string;
  startedAt: Timestamp;
  endedAt?: Timestamp | null;
  status: AcademySessionStatus;
  learnerIds: string[];
  attendance: Record<string, "present" | "absent" | "unknown">;
  facilitatorNote?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateSessionInput {
  facilitatorUid: string;
  activityId: string;
  activityKind: "lesson" | "scenario" | "assessment" | "reflection";
  activityTitle: string;
  trackId: string;
  learnerIds: string[];
}

export interface UpdateSessionAttendanceInput {
  sessionId: string;
  childId: string;
  status: "present" | "absent" | "unknown";
}

export interface UpdateSessionNoteInput {
  sessionId: string;
  note: string;
}

export interface CompleteSessionInput {
  sessionId: string;
}

// ============================================================================
// FIRESTORE OPERATIONS
// ============================================================================

/**
 * Create a new academy session.
 * Sets all required fields with server timestamps.
 * Learner IDs are captured at creation time (immutable snapshot).
 *
 * @param input - Session creation parameters
 * @returns The created session ID
 */
export async function createAcademySession(input: CreateSessionInput): Promise<string> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  // Initialize attendance with all learners as "unknown"
  const initialAttendance: Record<string, "present" | "absent" | "unknown"> = {};
  for (const learnerId of input.learnerIds) {
    initialAttendance[learnerId] = "unknown";
  }

  // Generate document ID
  const sessionRef = doc(collection(db, "academySessions"));
  const sessionId = sessionRef.id;

  // Create session document
  const session: AcademySession = {
    id: sessionId,
    facilitatorUid: input.facilitatorUid,
    activityId: input.activityId,
    activityKind: input.activityKind,
    activityTitle: input.activityTitle,
    trackId: input.trackId,
    startedAt: serverTimestamp() as Timestamp,
    endedAt: null,
    status: "active",
    learnerIds: input.learnerIds,
    attendance: initialAttendance,
    facilitatorNote: null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(sessionRef, session);
  return sessionId;
}

/**
 * Get a single academy session by ID.
 * Verifies facilitator ownership before returning.
 *
 * @param sessionId - Session ID
 * @param facilitatorUid - Current facilitator UID (for authorization check)
 * @returns The session or null if not found/unauthorized
 */
export async function getAcademySession(
  sessionId: string,
  facilitatorUid: string,
): Promise<AcademySession | null> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const sessionRef = doc(db, "academySessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    return null;
  }

  const session = sessionSnap.data() as AcademySession;

  // Verify facilitator ownership
  if (session.facilitatorUid !== facilitatorUid) {
    throw new Error(`Unauthorized: Session belongs to ${session.facilitatorUid}`);
  }

  return session;
}

/**
 * Get the active session for a facilitator/activity combination.
 * Used to prevent duplicate active sessions.
 *
 * @param facilitatorUid - Facilitator UID
 * @param activityId - Activity ID
 * @returns Active session if found, null otherwise
 */
export async function getActiveFacilitatorSession(
  facilitatorUid: string,
  activityId: string,
): Promise<AcademySession | null> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "academySessions"),
    where("facilitatorUid", "==", facilitatorUid),
    where("activityId", "==", activityId),
    where("status", "==", "active"),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  // Should be at most one active session per facilitator/activity
  return snapshot.docs[0]?.data() as AcademySession;
}

/**
 * List all sessions for a facilitator (active and completed).
 * Ordered by creation date (most recent first).
 *
 * @param facilitatorUid - Facilitator UID
 * @returns Array of sessions
 */
export async function listFacilitatorSessions(facilitatorUid: string): Promise<AcademySession[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "academySessions"),
    where("facilitatorUid", "==", facilitatorUid),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as AcademySession);
}

/**
 * Update attendance for a learner in an active session.
 * Must be the session owner.
 * Learner ID must be in the session's learnerIds.
 *
 * @param sessionId - Session ID
 * @param facilitatorUid - Current facilitator UID (for authorization)
 * @param childId - Learner child ID
 * @param status - Attendance status
 */
export async function updateSessionAttendance(
  sessionId: string,
  facilitatorUid: string,
  childId: string,
  status: "present" | "absent" | "unknown",
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const session = await getAcademySession(sessionId, facilitatorUid);
  if (!session) {
    throw new Error("Session not found or unauthorized");
  }

  // Verify the learner is in this session
  if (!session.learnerIds.includes(childId)) {
    throw new Error(`Learner ${childId} is not part of this session`);
  }

  // Update attendance
  const updatedAttendance = { ...session.attendance, [childId]: status };

  const sessionRef = doc(db, "academySessions", sessionId);
  await updateDoc(sessionRef, {
    attendance: updatedAttendance,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update the facilitator note for a session.
 * Must be the session owner.
 * Maximum 1000 characters.
 *
 * @param sessionId - Session ID
 * @param facilitatorUid - Current facilitator UID (for authorization)
 * @param note - Facilitator observation (max 1000 characters)
 */
export async function updateSessionNote(
  sessionId: string,
  facilitatorUid: string,
  note: string,
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const session = await getAcademySession(sessionId, facilitatorUid);
  if (!session) {
    throw new Error("Session not found or unauthorized");
  }

  // Enforce character limit
  if (note.length > 1000) {
    throw new Error("Facilitator note exceeds 1000 character limit");
  }

  const sessionRef = doc(db, "academySessions", sessionId);
  await updateDoc(sessionRef, {
    facilitatorNote: note || null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Complete an active session.
 * Sets status to "completed" and captures endedAt.
 * Must be the session owner.
 * Session must be currently active.
 *
 * @param sessionId - Session ID
 * @param facilitatorUid - Current facilitator UID (for authorization)
 */
export async function completeAcademySession(
  sessionId: string,
  facilitatorUid: string,
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error("Firestore not initialized");

  const session = await getAcademySession(sessionId, facilitatorUid);
  if (!session) {
    throw new Error("Session not found or unauthorized");
  }

  if (session.status !== "active") {
    throw new Error("Only active sessions can be completed");
  }

  const sessionRef = doc(db, "academySessions", sessionId);
  await updateDoc(sessionRef, {
    status: "completed",
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Compute session duration in minutes.
 * Returns null if session not yet completed.
 *
 * @param session - Academy session
 * @returns Duration in minutes, or null if active
 */
export function computeSessionDuration(session: AcademySession): number | null {
  if (!session.endedAt) {
    return null;
  }

  const startMs = session.startedAt.toMillis?.() ?? 0;
  const endMs = session.endedAt.toMillis?.() ?? 0;
  const durationMs = endMs - startMs;
  return Math.floor(durationMs / 60000); // Convert to minutes
}

/**
 * Compute attendance summary for a session.
 *
 * @param session - Academy session
 * @returns Counts of present, absent, and unknown
 */
export interface AttendanceSummary {
  present: number;
  absent: number;
  unknown: number;
  total: number;
}

export function computeAttendanceSummary(session: AcademySession): AttendanceSummary {
  const summary: AttendanceSummary = { present: 0, absent: 0, unknown: 0, total: 0 };

  for (const status of Object.values(session.attendance)) {
    if (status === "present") summary.present++;
    if (status === "absent") summary.absent++;
    if (status === "unknown") summary.unknown++;
    summary.total++;
  }

  return summary;
}
