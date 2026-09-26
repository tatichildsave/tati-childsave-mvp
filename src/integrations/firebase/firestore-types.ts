import type { Timestamp } from "firebase/firestore";
import type { AdultRole } from "@/lib/backend/identity";
import type { ChildProfile } from "@/lib/family";
import type { ProgressEvent } from "@/lib/learning/progress";
import type { AwardedAchievement } from "@/lib/gamification/achievements";

export type FirestoreTimestamp = Timestamp;

export interface FirestoreUserDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  status: "pending" | "active" | "disabled";
  roles: AdultRole[];
  emailVerified: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreFamilyDocument {
  name: string;
  createdBy: string;
  status: "active" | "disabled";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreFamilyMemberDocument {
  uid: string;
  role: "parent" | "guardian";
  status: "active" | "invited" | "removed";
  invitedBy: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreChildDocument extends Omit<ChildProfile, "created_at" | "updated_at"> {
  familyId: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreJourneyProgressDocument extends Omit<
  ProgressEvent,
  "created_at" | "updated_at"
> {
  familyId: string;
  childId: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreCompetencyDocument {
  competencyId: string;
  score: number;
  level: string;
  evidence: Record<string, unknown>;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreAchievementDocument extends AwardedAchievement {
  awardedAt: FirestoreTimestamp;
}

export interface FirestoreChildJourneySummary {
  currentItemKey: string | null;
  completedCount: number;
  completionPercent: number;
  lastActivityAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreChildCredentialDocument {
  tatiId: string;
  childId: string;
  familyId: string;
  pinHash: string;
  credentialVersion: number;
  active: boolean;
  revokedAt: FirestoreTimestamp | null;
  rotatedAt: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface FirestoreChildSessionDocument {
  childId: string;
  familyId: string;
  tokenHash: string;
  createdAt: FirestoreTimestamp;
  expiresAt: FirestoreTimestamp;
  revokedAt: FirestoreTimestamp | null;
  lastSeenAt: FirestoreTimestamp | null;
}

export interface FirestoreChildAuthIdentityDocument {
  childProfileId: string;
  firebaseUid: string;
  familyId: string;
  status: "active" | "revoked";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
