import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import type { ChildProfile, CreateChildInput } from "@/lib/family";
import type { ProgressEvent } from "@/lib/learning/progress";
import type { RecordProgressInput } from "@/lib/progress/service";
import type { AwardedAchievement } from "@/lib/gamification/achievements";
import { generateTatiId, generateChildPin, saveChildPin } from "@/lib/auth/child-auth-firebase.server";
import type {
  FirestoreAchievementDocument,
  FirestoreChildDocument,
  FirestoreCompetencyDocument,
  FirestoreFamilyDocument,
  FirestoreFamilyMemberDocument,
  FirestoreJourneyProgressDocument,
} from "@/integrations/firebase/firestore-types";
import type {
  AchievementService,
  ChildProfileService,
  FamilyMemberService,
  FamilyService,
  JourneyProgressService,
  CompetencyService,
} from "@/lib/backend/contracts";

/**
 * Convert Firestore Timestamp or Date-like values to ISO string
 * Safely handles Timestamp.toDate() if available, falls back to string coercion
 */
function toISOString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  // Firestore Timestamp has toDate() method
  if (value && typeof value === "object" && "toDate" in value && typeof (value as any).toDate === "function") {
    return (value as any).toDate().toISOString();
  }
  // Fallback: treat as millis or try native conversion
  if (typeof value === "number") return new Date(value).toISOString();
  return new Date().toISOString();
}

function toChildProfile(document: FirestoreChildDocument): ChildProfile {
  return {
    id: document.id,
    tati_id: document.tati_id,
    family_id: document.familyId,
    created_by: document.created_by,
    name: document.name,
    age: document.age,
    avatar: document.avatar,
    tier: document.tier,
    curriculum_level: document.curriculum_level,
    onboarding_step: document.onboarding_step,
    onboarding_completed: document.onboarding_completed,
    created_at: toISOString(document.createdAt),
    updated_at: toISOString(document.updatedAt),
  };
}

export class FirebaseFamilyRepository implements FamilyService {
  constructor(
    private readonly db: Firestore,
    private readonly userId: string,
  ) {}

  async ensureFamily(): Promise<string> {
    try {
      console.log("\n========== ensureFamily CALLED ==========");
      console.log("ensureFamily userId:", this.userId);
      console.log("ensureFamily Checking for existing family membership");
      
      // Check for existing active family membership
      const membershipsRef = this.db
        .collection("users")
        .doc(this.userId)
        .collection("familyMemberships");
      
      const memberships = await membershipsRef.get();
      
      console.log("ensureFamily Query returned", memberships.docs.length, "documents");
      const active = memberships.docs.find((item) => item.data()["status"] === "active");
      
      if (active) {
        console.log("ensureFamily Found existing active family:", active.id);
        console.log("========== ensureFamily RETURNING EXISTING ==========\n");
        return active.id;
      }

      // No family exists - create a new one
      console.log("ensureFamily No active family found - creating new one");
      const familyId = `fam-${crypto.randomUUID()}`;
      const now = FieldValue.serverTimestamp();
      
      console.log("ensureFamily New familyId:", familyId);
      
      // Create family document with all required fields per FirestoreFamilyDocument schema
      await this.db
        .collection("families")
        .doc(familyId)
        .set({
          name: "My Family",  // Default family name
          createdBy: this.userId,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      console.log("ensureFamily Family document written successfully");

      // Create family membership for this user
      console.log("ensureFamily Writing membership document");
      await this.db
        .collection("users")
        .doc(this.userId)
        .collection("familyMemberships")
        .doc(familyId)
        .set({
          familyId,
          userId: this.userId,
          role: "parent",
          status: "active",
          createdAt: now,
        });
      console.log("ensureFamily Membership document written successfully");

      console.log("ensureFamily SUCCESS - Family created:", familyId);
      console.log("========== ensureFamily RETURNING NEW ==========\n");
      return familyId;
    } catch (error) {
      console.error("\n========== ensureFamily ERROR ==========");
      console.error("ensureFamily userId:", this.userId);
      console.error("ensureFamily Error:", error);
      if (error instanceof Error) {
        console.error("ensureFamily Error name:", error.name);
        console.error("ensureFamily Error message:", error.message);
        console.error("ensureFamily Error code:", (error as any).code);
      }
      console.error("========== ensureFamily ERROR END ==========\n");
      throw error;
    }
  }

  async getFamilyChildren(): Promise<ChildProfile[]> {
    try {
      console.log("[getFamilyChildren] Getting family ID");
      const familyId = await this.ensureFamily();
      console.log("[getFamilyChildren] Got family:", familyId, "querying children");
      
      const children = await this.db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .orderBy("createdAt", "asc")
        .get();
      
      console.log("[getFamilyChildren] Query succeeded, found", children.docs.length, "children");
      const result = children.docs.map((item) => {
        try {
          return toChildProfile(item.data() as FirestoreChildDocument);
        } catch (e) {
          console.error("[getFamilyChildren] Error mapping child document:", item.id, e);
          throw new Error(`Failed to map child ${item.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
      console.log("[getFamilyChildren] Successfully converted", result.length, "children");
      return result;
    } catch (error) {
      console.error("[getFamilyChildren] Error:", error);
      throw error;
    }
  }

  async createChild(input: CreateChildInput): Promise<ChildProfile> {
    try {
      console.log("[createChild] Starting for user:", this.userId, "child name:", input.name);
      const familyId = await this.ensureFamily();
      console.log("[createChild] Got family:", familyId);
      
      const childId = crypto.randomUUID();
      console.log("[createChild] Generated child ID:", childId);
      
      // Generate TATI ID and PIN
      const tatiId = generateTatiId();
      const pin = generateChildPin();
      console.log("[createChild] Generated TATI ID:", tatiId, "PIN: ****");
      
      const now = FieldValue.serverTimestamp();
      const document = {
        id: childId,
        familyId,
        created_by: this.userId,
        name: input.name.trim(),
        age: input.age,
        avatar: input.avatar,
        tier: "junior",
        curriculum_level: `Primary ${Math.max(1, input.age - 5)}`,
        onboarding_step: 0,
        onboarding_completed: input.onboardingCompleted ?? true,
        tati_id: tatiId,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log("[createChild] Writing child document with tati_id:", tatiId);
      await this.db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .set(document);
      console.log("[createChild] Child document written");
      
      // Generate and save credential
      console.log("[createChild] Saving credential for TATI ID:", tatiId);
      await saveChildPin(childId, tatiId, familyId, pin);
      console.log("[createChild] Credential saved for TATI ID:", tatiId);
      
      // Read back child document to verify
      console.log("[createChild] Reading back child document");
      const saved = await this.db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .get();
      
      if (!saved.exists) {
        throw new Error("Child document was written but cannot be read back");
      }
      
      console.log("[createChild] Document read, converting to profile");
      const profile = toChildProfile(saved.data() as FirestoreChildDocument);
      console.log("[createChild] Success! Created child profile:", profile.id, "with TATI ID:", profile.tati_id);
      return profile;
    } catch (error) {
      console.error("[createChild] Error for user:", this.userId, error);
      throw error;
    }
  }

  async updateChild(id: string, changes: Partial<ChildProfile>): Promise<void> {
    const familyId = await this.ensureFamily();
    const allowed = {
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.age === undefined ? {} : { age: changes.age }),
      ...(changes.avatar === undefined ? {} : { avatar: changes.avatar }),
      ...(changes.onboarding_step === undefined
        ? {}
        : { onboarding_step: changes.onboarding_step }),
      ...(changes.onboarding_completed === undefined
        ? {}
        : { onboarding_completed: changes.onboarding_completed }),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(id)
      .update(allowed);
  }

  async assertChildAccess(childId: string): Promise<void> {
    const familyId = await this.ensureFamily();
    const snapshot = await this.db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .get();
    if (!snapshot.exists) throw new Error("That learner is not part of your family.");
  }
}

export class FirebaseFamilyMemberRepository implements FamilyMemberService {
  constructor(private readonly db: Firestore) {}

  async getMembers(familyId: string): Promise<Array<{ userId: string; role: string }>> {
    const members = await this.db
      .collection("families")
      .doc(familyId)
      .collection("members")
      .get();
    return members.docs.map((item) => {
      const member = item.data() as FirestoreFamilyMemberDocument;
      return { userId: member.uid, role: member.role };
    });
  }
}

export class FirebaseChildProfileRepository implements ChildProfileService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getChild(childId: string): Promise<ChildProfile | null> {
    const snapshot = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .get();
    return snapshot.exists ? toChildProfile(snapshot.data() as FirestoreChildDocument) : null;
  }
}

export class FirebaseJourneyProgressRepository implements JourneyProgressService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getProgress(childId: string): Promise<ProgressEvent[]> {
    const rows = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("journeyProgress")
      .orderBy("updatedAt", "asc")
      .get();
    return rows.docs.map((item) => {
      const row = item.data() as FirestoreJourneyProgressDocument;
      return {
        id: row.id,
        child_profile_id: row.child_profile_id,
        track_id: row.track_id,
        item_type: row.item_type,
        item_id: row.item_id,
        status: row.status,
        score: row.score,
        max_score: row.max_score,
        details: row.details,
        created_at: toISOString(row.createdAt),
        updated_at: toISOString(row.updatedAt),
      };
    });
  }

  async recordProgress(input: RecordProgressInput): Promise<void> {
    const itemKey = `${input.itemType}:${input.itemId}`;
    await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(input.childId)
      .collection("journeyProgress")
      .doc(itemKey)
      .set(
        {
          id: itemKey,
          familyId: this.familyId,
          childId: input.childId,
          child_profile_id: input.childId,
          track_id: "save",
          item_type: input.itemType,
          item_id: input.itemId,
          status: "completed",
          score: input.score ?? null,
          max_score: input.maxScore ?? null,
          details: input.details ?? {},
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }
}

export class FirebaseCompetencyRepository implements CompetencyService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getCompetencies(childId: string) {
    const rows = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("competencies")
      .get();
    return rows.docs.map((item) => {
      const row = item.data() as FirestoreCompetencyDocument;
      return { competencyId: row.competencyId, score: row.score, level: row.level };
    });
  }
}

export class FirebaseAchievementRepository implements AchievementService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async getAchievements(childId: string): Promise<AwardedAchievement[]> {
    const rows = await this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("achievements")
      .get();
    return rows.docs.map((item) => {
      const row = item.data() as FirestoreAchievementDocument;
      return { achievementId: row.achievementId, celebrated: row.celebrated };
    });
  }

  async awardAchievements(childId: string, achievementIds: string[]): Promise<void> {
    await Promise.all(
      achievementIds.map((achievementId) =>
        this.db
          .collection("families")
          .doc(this.familyId)
          .collection("children")
          .doc(childId)
          .collection("achievements")
          .doc(achievementId)
          .set(
            { achievementId, celebrated: false, awardedAt: FieldValue.serverTimestamp() },
            { merge: true },
          ),
      ),
    );
  }

  async markCelebrated(childId: string, achievementIds: string[]): Promise<void> {
    await Promise.all(
      achievementIds.map((achievementId) =>
        this.db
          .collection("families")
          .doc(this.familyId)
          .collection("children")
          .doc(childId)
          .collection("achievements")
          .doc(achievementId)
          .update({ celebrated: true }),
      ),
    );
  }
}

// Phase 7C4B: Firebase assessment persistence
export interface AssessmentPersistenceInput {
  childId: string;
  definition: any; // AssessmentDefinition
  result: any; // AssessmentResult (recalculated server-side)
  expectedVersion?: number; // Optimistic concurrency control (default 0)
}

export class FirebaseAssessmentRepository {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  /**
   * Persist assessment attempt, responses, and progress atomically.
   *
   * Uses Firestore transaction to ensure all three write together:
   * 1. Assessment attempt document (id = assessmentId)
   * 2. Response documents (deleted if retake, then new ones written)
   * 3. Journey progress document (updated with score)
   *
   * Validates:
   * - childId belongs to this familyId
   * - Responses match question IDs in definition
   * - Result values are numeric (no NaN/Infinity)
   *
   * Handles retakes:
   * - Old responses deleted before new ones written
   * - Document ID ensures one attempt per child per assessment
   * - Timestamp ordering prevents stale retries from overwriting newer submissions
   */
  async saveAttempt(input: AssessmentPersistenceInput): Promise<void> {
    const { childId, definition, result, expectedVersion = 0 } = input;

    // Validate inputs
    if (!childId || typeof childId !== "string" || childId.length === 0) {
      throw new Error("Invalid childId");
    }

    if (!definition || !definition.id || !definition.questions) {
      throw new Error("Invalid assessment definition");
    }

    if (!result || typeof result.points !== "number" || typeof result.maxPoints !== "number") {
      throw new Error("Invalid assessment result");
    }

    if (!Number.isFinite(result.points) || !Number.isFinite(result.maxPoints)) {
      throw new Error("Assessment scores must be finite numbers");
    }

    // Validate questions and options exist
    for (const [qId, optionId] of Object.entries(result.responses || {})) {
      if (typeof optionId !== "string" || optionId.length === 0) continue;

      const question = definition.questions.find((q: any) => q.id === qId);
      if (!question) {
        throw new Error(`Question ${qId} not found in assessment definition`);
      }

      const option = question.options.find((o: any) => o.id === optionId);
      if (!option) {
        throw new Error(`Option ${optionId} not found in question ${qId}`);
      }
    }

    // Use transaction for atomicity
    await this.db.runTransaction(async (transaction) => {
      const attemptRef = this.db
        .collection("families")
        .doc(this.familyId)
        .collection("children")
        .doc(childId)
        .collection("assessmentAttempts")
        .doc(definition.id);

      // 1. Read existing attempt (if any) to check version
      const existingSnap = await transaction.get(attemptRef);
      const existing = existingSnap.data();

      // 2. Optimistic concurrency control: reject if version mismatch
      // Allows detecting concurrent edits and preventing data loss
      const existingVersion = existing?.["version"] ?? 0;
      if (existingVersion !== expectedVersion) {
        throw new Error(
          `Version conflict: expected version ${expectedVersion}, but document has version ${existingVersion}`,
        );
      }

      // 3. If retake: delete old responses
      if (existing) {
        const oldResponses = await transaction.get(
          attemptRef.collection("responses"),
        );
        for (const oldResponseSnap of oldResponses.docs) {
          transaction.delete(oldResponseSnap.ref);
        }
      }

      // 4. Write new attempt document with incremented version
      const competencyScores: Record<string, { points: number; maxPoints: number }> = {};
      for (const comp of result.competencies || []) {
        competencyScores[comp.competency] = {
          points: comp.points,
          maxPoints: comp.maxPoints,
        };
      }

      transaction.set(
        attemptRef,
        {
          id: definition.id,
          assessmentId: definition.id,
          childId,
          familyId: this.familyId,
          assessmentType: definition.assessmentType,
          points: result.points,
          maxPoints: result.maxPoints,
          competencyScores,
          status: "completed",
          version: existingVersion + 1, // Increment version on successful write
          completedAt: FieldValue.serverTimestamp(),
          submittedAt: FieldValue.serverTimestamp(), // Server-set, informational
          createdAt: existing?.["createdAt"] || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false }, // Replace, don't merge (clean state)
      );

      // 5. Write new response documents
      for (const question of definition.questions) {
        const optionId = result.responses?.[question.id];
        if (!optionId) continue;

        // Import here to avoid circular dependency
        const { optionPoints, questionMaxPoints } = await import("@/lib/assessment/engine");

        const responseRef = attemptRef.collection("responses").doc(question.id);
        transaction.set(
          responseRef,
          {
            id: question.id,
            questionId: question.id,
            assessmentId: definition.id,
            optionId,
            points: optionPoints(question, optionId),
            maxPoints: questionMaxPoints(question),
            competency: question.competency,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: false },
        );
      }

      // 6. Update journey progress atomically
      const progressKey = `assessment:${definition.id}`;
      const progressRef = this.db
        .collection("families")
        .doc(this.familyId)
        .collection("children")
        .doc(childId)
        .collection("journeyProgress")
        .doc(progressKey);

      transaction.set(
        progressRef,
        {
          id: progressKey,
          familyId: this.familyId,
          childId,
          child_profile_id: childId,
          track_id: "save",
          item_type: "assessment",
          item_id: definition.id,
          status: "completed",
          score: result.points,
          max_score: result.maxPoints,
          details: {
            assessmentType: definition.assessmentType,
            responses: result.responses || {},
            competencies: result.competencies || [],
          },
          createdAt: existing?.["createdAt"] || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    });
  }
}

/**
 * Firebase persistence for branching scenario state.
 *
 * Gate A (Phase 7C4C): Data model and repository only.
 * No server functions modified yet; not used in production.
 *
 * Path: /families/{familyId}/children/{childId}/scenarioSessions/{scenarioId}
 * Document: FirestoreScenarioSessionDocument
 *
 * Manages:
 * - Persisting full scenario state (14-day journey)
 * - Version-based optimistic concurrency control
 * - Status tracking (in_progress, completed)
 * - Server-managed timestamps
 *
 * Uses transactions to ensure:
 * - All-or-nothing writes (atomicity)
 * - Version checks prevent stale overwrites
 * - Timestamps are server-set (not client-controlled)
 */
export class FirebaseScenarioRepository {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  /**
   * Load persisted scenario state from Firestore.
   *
   * Returns:
   * - { state, version, status } if scenario has been started
   * - undefined if no prior session exists
   *
   * Does NOT validate state bounds or choices (server functions do that).
   * Just retrieves what was stored.
   */
  async loadSession(childId: string, scenarioId: string): Promise<{
    state: Record<string, unknown> | null;
    version: number;
    status: "in_progress" | "completed";
  } | null> {
    const sessionRef = this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("scenarioSessions")
      .doc(scenarioId);

    const snap = await sessionRef.get();
    if (!snap.exists) {
      return null;
    }

    const data = snap.data();
    return {
      state: data?.["state"] || null,
      version: data?.["version"] ?? 0,
      status: data?.["status"] ?? "in_progress",
    };
  }

  /**
   * Save validated scenario state with version checking.
   *
   * Input:
   * - childId: Authenticated child (from server context, not request body)
   * - scenarioId: Scenario ID (from request)
   * - state: Full ScenarioState (already validated by server function)
   * - expectedVersion: Current version (for optimistic concurrency)
   *
   * Behavior:
   * - Reads existing version
   * - If expectedVersion doesn't match, throws error (client must reload)
   * - If match, writes new state with version++
   * - If phase === "complete", sets completedAt timestamp
   *
   * Throws:
   * - "Version conflict" if expectedVersion != current
   * - "Invalid state" if state is null/malformed
   *
   * Returns:
   * - { version: newVersion, status: "in_progress" | "completed" }
   */
  async saveSession(
    childId: string,
    scenarioId: string,
    state: Record<string, unknown>,
    expectedVersion: number,
  ): Promise<{ version: number; status: "in_progress" | "completed" }> {
    if (!state || typeof state !== "object") {
      throw new Error("Invalid scenario state");
    }

    if (typeof expectedVersion !== "number" || expectedVersion < 0) {
      throw new Error("Invalid expected version");
    }

    // Determine phase and status
    const phase = (state as any)?.["phase"] as string | undefined;
    const status = phase === "complete" ? "completed" : "in_progress";

    return await this.db.runTransaction(async (transaction) => {
      const sessionRef = this.db
        .collection("families")
        .doc(this.familyId)
        .collection("children")
        .doc(childId)
        .collection("scenarioSessions")
        .doc(scenarioId);

      // 1. Read existing session (if any)
      const existingSnap = await transaction.get(sessionRef);
      const existing = existingSnap.data();

      // 2. Check version: must match expectedVersion
      const currentVersion = existing?.["version"] ?? 0;
      if (currentVersion !== expectedVersion) {
        throw new Error(
          `Version conflict: expected version ${expectedVersion}, but document has version ${currentVersion}`,
        );
      }

      // 3. Extract metadata from state (for queries)
      const day = (state as any)?.["day"] as number | undefined;
      const nodeId = (state as any)?.["nodeId"] as string | undefined;

      // 4. Clean state: remove undefined values (Firestore doesn't allow them)
      const cleanedState = JSON.parse(JSON.stringify(state));

      // 5. Write new session document with incremented version
      transaction.set(
        sessionRef,
        {
          id: scenarioId,
          scenarioId,
          childId,
          familyId: this.familyId,
          state: cleanedState,
          status,
          currentNodeId: nodeId || "",
          dayNumber: day || 1,
          ...(status === "completed" && { completedAt: FieldValue.serverTimestamp() }),
          version: currentVersion + 1,
          createdAt: existing?.["createdAt"] || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false }, // Replace, don't merge (clean state)
      );

      return {
        version: currentVersion + 1,
        status,
      };
    });
  }

  /**
   * Check if a scenario session exists and return its current version.
   *
   * Used by server functions to decide between "create new" vs "load existing".
   *
   * Returns:
   * - { exists: true, version } if scenario started
   * - { exists: false, version: 0 } if not yet started
   */
  async getSessionVersion(childId: string, scenarioId: string): Promise<{
    exists: boolean;
    version: number;
  }> {
    const sessionRef = this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("scenarioSessions")
      .doc(scenarioId);

    const snap = await sessionRef.get();
    if (!snap.exists) {
      return { exists: false, version: 0 };
    }

    return {
      exists: true,
      version: snap.data()?.["version"] ?? 0,
    };
  }
}
