import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { getAssessmentDefinition } from "@/lib/assessment/registry";
import { scoreAssessment } from "@/lib/assessment/engine";
import { getTrack } from "@/lib/learning/track";
import { getLessonById } from "@/lib/lessons/registry";
import { getScenarioDefinition, getEnhancedScenarioDefinition } from "@/lib/scenario/registry";
import type { ScenarioState } from "@/lib/scenario/types";
import { createInitialState, beginScenario, applyChoice, advance } from "@/lib/scenario/engine";
import type { AuthenticatedChildContext } from "./types";

const COOKIE_NAME = "tati_child_session";

const MAX_PROGRESS_DETAILS_BYTES = 4096;
const MAX_ASSESSMENT_RESPONSES = 200;
const MAX_ASSESSMENT_RESPONSE_CHARS = 2000;

export const progressInput = z
  .object({
    itemType: z.enum(["assessment", "lesson", "scenario", "reflection"]),
    itemId: z.string().min(1).max(128),
    score: z.number().int().min(0).max(100_000).nullable().optional(),
    maxScore: z.number().int().min(0).max(100_000).nullable().optional(),
    details: z.record(z.string().max(128), z.unknown()).optional(),
  })
  .refine(
    (d) => d.score == null || d.maxScore == null || d.score <= d.maxScore,
    { message: "Score cannot exceed the maximum score.", path: ["score"] },
  )
  .refine(
    (d) => d.details === undefined || JSON.stringify(d.details).length <= MAX_PROGRESS_DETAILS_BYTES,
    { message: "Progress details are too large.", path: ["details"] },
  );

export type ScenarioStateInput = ScenarioState & { expectedVersion: number };

const scenarioConsequenceInput = z.object({
  decisionChip: z.string().optional(),
  headline: z.string(),
  title: z.string(),
  body: z.string(),
  image: z.string().optional(),
  imageCaption: z.string().optional(),
  ledgerNote: z.string().optional(),
  debtNote: z.string().optional(),
  laterHint: z.string().optional(),
  reflection: z.string().optional(),
});

const scenarioStateInput: z.ZodType<ScenarioStateInput> = z.object({
  scenarioId: z.string().min(1).max(128),
  day: z.number().int().min(1).max(366),
  available: z.number().min(0),
  saved: z.number().min(0),
  goalTarget: z.number().min(0),
  competencies: z.record(z.string(), z.number()),
  flags: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  scheduled: z
    .array(
      z.object({
        dueDay: z.number().int().min(1).max(366),
        nodeId: z.string().min(1).max(128),
        requiresFlag: z.string().optional(),
      }),
    )
    .max(200),
  nodeId: z.string().min(1).max(128),
  nextNodeId: z.string().min(1).max(128).optional(),
  phase: z.enum(["intro", "decision", "consequence", "complete"]),
  consequence: scenarioConsequenceInput.optional(),
  decisions: z
    .array(
      z.object({
        day: z.number().int().min(1).max(366),
        nodeId: z.string().min(1).max(128),
        nodeTitle: z.string(),
        choiceId: z.string().min(1).max(128),
        choiceLabel: z.string(),
        availableAfter: z.number().min(0),
        savedAfter: z.number().min(0),
      }),
    )
    .max(200),
  endingId: z.string().min(1).max(128).optional(),
  previousAvailable: z.number().min(0).optional(),
  previousSaved: z.number().min(0).optional(),
  totals: z.object({
    earned: z.number().min(0),
    spent: z.number().min(0),
    movedToSavings: z.number().min(0),
  }),
  updatedAt: z.string().datetime(),
  expectedVersion: z.number().int().min(0),
});

export const assessmentInput = z.object({
  assessmentId: z.string().min(1).max(128),
  responses: z
    .record(z.string().max(128), z.string().max(MAX_ASSESSMENT_RESPONSE_CHARS))
    .refine((r) => Object.keys(r).length <= MAX_ASSESSMENT_RESPONSES, {
      message: "Too many assessment responses.",
    }),
  points: z.number().int().min(0).max(100_000),
  maxPoints: z.number().int().min(0).max(100_000),
  competencyScores: z
    .record(z.string().max(128), z.unknown())
    .refine((r) => JSON.stringify(r).length <= MAX_PROGRESS_DETAILS_BYTES, {
      message: "Competency scores are too large.",
    }),
  expectedVersion: z.number().int().min(0).default(0),
});

export type ChildLearningProfile = {
  id: string;
  tati_id: string;
  name: string;
  age: number;
  avatar: string;
  tier: string;
  curriculum_level: string | null;
};

export type ChildLearningData = {
  profile: ChildLearningProfile;
  progress: Array<{
    id: string;
    track_id: string;
    item_type: string;
    item_id: string;
    status: string;
    score: number | null;
    max_score: number | null;
    details: Json;
    created_at: string;
    updated_at: string;
  }>;
  competencies: Array<{ competency_id: string; score: number; level: string; evidence: Json }>;
  achievements: Array<{ achievement_id: string; celebrated: boolean; awarded_at: string }>;
  assessments: Array<{
    assessment_id: string;
    assessment_type: string;
    points: number;
    max_points: number;
    competency_scores: Json;
    completed_at: string;
  }>;
};

/**
 * Get authenticated child context (G3 integration).
 * Validates session, loads profile, resolves optional Firebase identity.
 * Throws AuthorizationError if context cannot be established.
 * Uses dynamic import to avoid client-side server code contamination.
 */
export async function getCurrentChildContext(): Promise<AuthenticatedChildContext> {
  const { getAuthenticatedChild } = await import("./child-session.server");
  const { AuthorizationError } = await import("./authorization.server");
  const context = await getAuthenticatedChild();
  if (!context) throw new AuthorizationError("Child session required.");
  return context;
}

/**
 * Legacy: Get current child ID from authenticated context.
 * Kept for backward compatibility with non-assessment functions.
 * Prefer getCurrentChildContext() for assessment operations.
 */
async function currentChildId(): Promise<string> {
  const context = await getCurrentChildContext();
  return context.childId;
}

async function loadProfile(context: AuthenticatedChildContext): Promise<ChildLearningProfile> {
  // H4.B: Load profile from Firebase instead of Supabase
  // The profile is stored in Firebase during child account creation
  const { loadChildProfile } = await import("./child-auth-firebase.server");

  const profile = await loadChildProfile(context.childId, context.familyId);

  if (!profile) throw new Error("Child profile unavailable.");

  // Transform Firebase profile to expected format
  return {
    id: profile.id,
    tati_id: profile.tatiId,
    name: profile.name,
    age: profile.age,
    avatar: profile.avatar,
    tier: profile.tier,
    curriculum_level: profile.curriculumLevel,
  } as ChildLearningProfile;
}

/**
 * Load child learning data from Firebase (H4.B migration).
 * Requires authenticated child context with childId and familyId.
 */
async function loadChildLearningDataFromFirebase(
  context: AuthenticatedChildContext,
): Promise<Omit<ChildLearningData, "profile">> {
  try {
    // H4.B: Dynamic imports to avoid client-side server code contamination
    const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
    const {
      FirebaseJourneyProgressRepository,
      FirebaseCompetencyRepository,
      FirebaseAchievementRepository,
    } = await import("@/lib/backend/firebase/repositories.server");

    const db = getFirebaseAdminDb();
    const progressRepo = new FirebaseJourneyProgressRepository(db, context.familyId);
    const competencyRepo = new FirebaseCompetencyRepository(db, context.familyId);
    const achievementRepo = new FirebaseAchievementRepository(db, context.familyId);

    const [progress, competencies, achievements] = await Promise.all([
      progressRepo.getProgress(context.childId),
      competencyRepo.getCompetencies(context.childId),
      achievementRepo.getAchievements(context.childId),
    ]);

    // Transform from Firebase format to ChildLearningData format
    return {
      progress: progress || [],
      competencies: competencies || [],
      achievements: achievements || [],
      assessments: [], // H4.C will handle assessments
    };
  } catch (error) {
    console.error(
      "[H4.B] Failed to load child learning data from Firebase:",
      error instanceof Error ? error.name : "unknown error",
    );
    throw new Error("Learning data unavailable.");
  }
}

function trackItemExists(itemType: string, itemId: string): boolean {
  const track = getTrack("save");
  return track.sequence.some((item) => item.kind === itemType && item.id === itemId);
}

/**
 * Gate B: Track membership check for scenario *definitions*.
 *
 * The track sequence stores scenarios as per-chapter stops
 * (e.g. "kwame-request--ch1") that each reference a single underlying
 * scenario definition id ("kwame-request"). The scenario engine, the
 * persisted ScenarioState and the client all work in terms of the definition
 * id, so membership must be resolved through `item.scenarioId` as well as
 * `item.id`. Checking only `item.id` rejects every real request.
 */
function trackScenarioExists(scenarioId: string): boolean {
  const track = getTrack("save");
  return track.sequence.some(
    (item) =>
      item.kind === "scenario" && (item.id === scenarioId || item.scenarioId === scenarioId),
  );
}

// ============================================================================
// G5: SCENARIO VALIDATION FUNCTIONS
// ============================================================================

/**
 * G5: Validate that a submitted scenario state has valid basic structure.
 * This ensures fundamental properties are within acceptable bounds.
 */
function validateScenarioStateBounds(state: unknown): { valid: boolean; error?: string } {
  if (!state || typeof state !== "object") {
    return { valid: false, error: "State must be an object" };
  }

  const s = state as Record<string, unknown>;

  // Basic type and bounds checks
  const day = s["day"];
  if (typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 366) {
    return { valid: false, error: "Invalid day value" };
  }

  const available = s["available"];
  if (typeof available !== "number" || available < 0 || !Number.isFinite(available)) {
    return { valid: false, error: "Invalid available money" };
  }

  const saved = s["saved"];
  if (typeof saved !== "number" || saved < 0 || !Number.isFinite(saved)) {
    return { valid: false, error: "Invalid saved money" };
  }

  const goalTarget = s["goalTarget"];
  if (typeof goalTarget !== "number" || goalTarget < 0 || !Number.isFinite(goalTarget)) {
    return { valid: false, error: "Invalid goal target" };
  }

  // Total money reasonableness check (prevent massive values)
  const totalMoney = (available as number) + (saved as number);
  if (totalMoney > 10000) {
    return { valid: false, error: "Money values are unreasonably large" };
  }

  // Check competencies structure if present
  const competencies = s["competencies"];
  if (competencies && typeof competencies !== "object") {
    return { valid: false, error: "Competencies must be an object" };
  }

  if (competencies) {
    const comps = competencies as Record<string, unknown>;
    for (const [key, value] of Object.entries(comps)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return { valid: false, error: `Invalid competency value for ${key}` };
      }
    }
  }

  return { valid: true };
}

/**
 * G5: Validate that a choice exists and belongs to the given node.
 * Returns true only if the choice is actually available in this node.
 */
function validateChoice(
  enhanced: ReturnType<typeof getEnhancedScenarioDefinition>,
  nodeId: string,
  choiceId: string,
): { valid: boolean; error?: string } {
  if (!enhanced) {
    return { valid: false, error: "Scenario definition not available" };
  }

  const choicesInNode = enhanced.choiceIndex.get(nodeId);
  if (!choicesInNode || !choicesInNode.has(choiceId)) {
    return { valid: false, error: `That choice is not available in this story moment` };
  }

  return { valid: true };
}

/**
 * G5: Validate that a node is reachable from the scenario start.
 * Uses the precomputed reachability set for O(1) lookup.
 */
function validateNodeReachability(
  enhanced: ReturnType<typeof getEnhancedScenarioDefinition>,
  nodeId: string,
): { valid: boolean; error?: string } {
  if (!enhanced) {
    return { valid: false, error: "Scenario definition not available" };
  }

  if (!enhanced.reachableNodes.has(nodeId)) {
    return { valid: false, error: "That story moment is not reachable" };
  }

  return { valid: true };
}

/**
 * G5: Validate that day is within scenario bounds.
 */
function validateDay(
  enhanced: ReturnType<typeof getEnhancedScenarioDefinition>,
  day: number,
): { valid: boolean; error?: string } {
  if (!enhanced) {
    return { valid: false, error: "Scenario definition not available" };
  }

  if (day < 1 || day > enhanced.totalDays) {
    return { valid: false, error: `Day must be between 1 and ${enhanced.totalDays}` };
  }

  return { valid: true };
}

/**
 * G5: Validate that the submitted scenario state is structurally valid.
 * This checks scenario existence, node validity, choice validity, day bounds, etc.
 */
function validateScenarioState(
  enhanced: ReturnType<typeof getEnhancedScenarioDefinition>,
  state: ScenarioState,
): { valid: boolean; error?: string } {
  if (!enhanced) {
    return { valid: false, error: "Scenario definition not available" };
  }

  // 1. Validate day bounds
  const dayCheck = validateDay(enhanced, state.day);
  if (!dayCheck.valid) return dayCheck;

  // 2. Validate current node is reachable
  const nodeCheck = validateNodeReachability(enhanced, state.nodeId);
  if (!nodeCheck.valid) return nodeCheck;

  // 3. Validate phase is one of the known phases
  if (!["intro", "decision", "consequence", "complete"].includes(state.phase)) {
    return { valid: false, error: "Invalid scenario phase" };
  }

  // 4. Validate all decisions in the history
  for (let i = 0; i < state.decisions.length; i++) {
    const decision = state.decisions[i];
    if (!decision) {
      return { valid: false, error: `Invalid decision at index ${i}` };
    }

    const decNodeId = decision.nodeId;
    const decChoiceId = decision.choiceId;

    if (!decNodeId || !decChoiceId) {
      return { valid: false, error: `Missing nodeId or choiceId in decision ${i}` };
    }

    // Validate choice existed in that node
    const choiceCheck = validateChoice(enhanced, decNodeId, decChoiceId);
    if (!choiceCheck.valid) {
      return { valid: false, error: `Decision ${i}: ${choiceCheck.error}` };
    }
  }

  // 5. Validate ending ID if present
  if (state.endingId && !enhanced.endingIds.has(state.endingId)) {
    return { valid: false, error: "Invalid story ending" };
  }

  return { valid: true };
}

/**
 * G5: Validate authenticated child context for scenario operations.
 * Ensures session is valid, not expired, and matches expected profile.
 */
function validateChildContext(context: AuthenticatedChildContext): {
  valid: boolean;
  error?: string;
} {
  // Check session kind
  if (context.session.kind !== "child") {
    return { valid: false, error: "Child session required for scenarios" };
  }

  // Check session not expired
  const expiresAt = new Date(context.session.expiresAt);
  if (expiresAt < new Date()) {
    return { valid: false, error: "Session expired" };
  }

  // Check session not revoked
  if (context.session.revokedAt) {
    return { valid: false, error: "Session revoked" };
  }

  // Check Firebase identity consistency if present
  if (context.firebase && context.firebase.familyId !== context.familyId) {
    return { valid: false, error: "Firebase identity mismatch" };
  }

  return { valid: true };
}

/**
 * G5.1: Verify that submitted scenario state was actually produced by the engine.
 * Replays all decisions through the scenario engine and compares the result
 * to the submitted state. Prevents client fabrication of progress.
 *
 * Critical for integrity: ensures money, competencies, and other computed
 * values match what the engine actually produces from the choice sequence.
 */
function verifyScenarioStateConsistency(
  definition: ReturnType<typeof getScenarioDefinition>,
  submittedState: ScenarioState,
): { valid: boolean; error?: string; derivedState?: ScenarioState } {
  if (!definition) {
    return { valid: false, error: "Scenario definition not available" };
  }

  let verifiedState = createInitialState(definition);

  if (submittedState.decisions.length === 0) {
    const initialCheckpoint =
      submittedState.phase === "intro" ? verifiedState : beginScenario(verifiedState);
    if (submittedState.phase !== "intro" && submittedState.phase !== "decision") {
      return {
        valid: false,
        error: `Invalid phase "${submittedState.phase}" before the first decision`,
      };
    }
    return compareScenarioCheckpoint(initialCheckpoint, submittedState);
  }

  for (let i = 0; i < submittedState.decisions.length; i++) {
    const decision = submittedState.decisions[i];

    // Skip if decision is malformed
    if (!decision || typeof decision !== "object") {
      return {
        valid: false,
        error: `Decision ${i}: malformed decision object`,
      };
    }

    const choiceId = decision.choiceId;
    if (!choiceId || typeof choiceId !== "string") {
      return {
        valid: false,
        error: `Decision ${i}: missing or invalid choiceId`,
      };
    }

    if (verifiedState.phase === "intro") {
      verifiedState = beginScenario(verifiedState);
    }

    const consequenceState = applyChoice(definition, verifiedState, choiceId);

    if (consequenceState === verifiedState) {
      return {
        valid: false,
        error: `Decision ${i}: choice "${choiceId}" could not be applied`,
      };
    }

    const isLastDecision = i === submittedState.decisions.length - 1;
    if (isLastDecision && submittedState.phase === "consequence") {
      return compareScenarioCheckpoint(consequenceState, submittedState);
    }

    verifiedState = advance(definition, consequenceState);
    if (verifiedState.phase === "complete" && !isLastDecision) {
      return {
        valid: false,
        error: `Decision ${i + 1}: scenario was already complete`,
      };
    }
  }

  if (submittedState.phase !== "decision" && submittedState.phase !== "complete") {
    return {
      valid: false,
      error: `Invalid phase "${submittedState.phase}" after continuing`,
      derivedState: verifiedState,
    };
  }

  return compareScenarioCheckpoint(verifiedState, submittedState);
}

function compareScenarioCheckpoint(
  derivedState: ScenarioState,
  submittedState: ScenarioState,
): { valid: boolean; error?: string; derivedState?: ScenarioState } {
  const comparable = (state: ScenarioState) => ({
    scenarioId: state.scenarioId,
    day: state.day,
    available: state.available,
    saved: state.saved,
    goalTarget: state.goalTarget,
    competencies: state.competencies,
    flags: state.flags,
    scheduled: state.scheduled,
    nodeId: state.nodeId,
    nextNodeId: state.nextNodeId,
    phase: state.phase,
    consequence: state.consequence,
    decisions: state.decisions,
    endingId: state.endingId,
    previousAvailable: state.previousAvailable,
    previousSaved: state.previousSaved,
    totals: state.totals,
  });

  if (JSON.stringify(comparable(derivedState)) !== JSON.stringify(comparable(submittedState))) {
    return {
      valid: false,
      error: "Submitted checkpoint does not match the authoritative scenario engine",
      derivedState,
    };
  }

  return { valid: true, derivedState };
}

export const getChildLearningData = createServerFn({ method: "GET" }).handler(async () => {
  // Get authenticated child context (includes childId and familyId)
  const context = await getCurrentChildContext();

  // Load profile and learning data in parallel
  const [profile, learningData] = await Promise.all([
    loadProfile(context),
    loadChildLearningDataFromFirebase(context),
  ]);

  return {
    profile,
    progress: learningData.progress as ChildLearningData["progress"],
    competencies: learningData.competencies as ChildLearningData["competencies"],
    achievements: learningData.achievements as ChildLearningData["achievements"],
    assessments: learningData.assessments as ChildLearningData["assessments"],
  } satisfies ChildLearningData;
});

export const assertChildActivity = createServerFn({ method: "GET" })
  .validator(
    z.object({
      itemType: z.enum(["lesson", "scenario", "assessment", "reflection"]),
      itemId: z.string().min(1).max(128),
    }),
  )
  .handler(async ({ data }) => {
    // G4: Use authenticated child context instead of session-only validation
    await getCurrentChildContext();
    if (!trackItemExists(data.itemType, data.itemId))
      throw new Error("That activity is not in this journey.");
    return { ok: true };
  });

export const recordChildProgress = createServerFn({ method: "POST" })
  .validator(progressInput)
  .handler(async ({ data }) => {
    // Get authenticated child context
    const context = await getCurrentChildContext();
    const childId = context.childId;
    const familyId = context.familyId;

    if (!trackItemExists(data.itemType, data.itemId))
      throw new Error("That activity is not in this journey.");

    try {
      // H4.B: Dynamic imports to avoid client-side server code contamination
      const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
      const { FirebaseJourneyProgressRepository } =
        await import("@/lib/backend/firebase/repositories.server");

      const db = getFirebaseAdminDb();
      const progressRepo = new FirebaseJourneyProgressRepository(db, familyId);

      await progressRepo.recordProgress({
        childId,
        itemType: data.itemType as "assessment" | "lesson" | "scenario" | "reflection",
        itemId: data.itemId,
        score: data.score,
        maxScore: data.maxScore,
        details: data.details,
      });

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[H4.B] recordChildProgress error:", error instanceof Error ? error.name : "unknown error");
      throw new Error(`Failed to record progress: ${message}`);
    }
  });

export const saveChildAssessment = createServerFn({ method: "POST" })
  .validator(assessmentInput)
  .handler(async ({ data }) => {
    // G4: Use authenticated child context for server-side child identity
    const context = await getCurrentChildContext();
    const childId = context.childId;
    const familyId = context.familyId;

    const definition = getAssessmentDefinition(data.assessmentId);
    if (!definition) throw new Error("That check-in is not available.");

    // Verify assessment is in the current track
    if (definition.trackId !== "save") {
      throw new Error("That check-in is not available in this track.");
    }

    // Server-side score calculation (client score ignored)
    // This ensures score integrity; client cannot submit arbitrary scores
    const calculatedResult = scoreAssessment(definition, data.responses);

    try {
      // Phase 7C4B: Use Firebase persistence (atomic transaction)
      const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
      const { FirebaseAssessmentRepository } = await import("@/lib/backend/firebase/repositories.server");

      const db = getFirebaseAdminDb();
      const assessmentRepo = new FirebaseAssessmentRepository(db, familyId);

      await assessmentRepo.saveAttempt({
        childId,
        definition,
        result: {
          assessmentId: definition.id,
          assessmentType: definition.assessmentType,
          points: calculatedResult.points,
          maxPoints: calculatedResult.maxPoints,
          responses: data.responses,
          competencies: calculatedResult.competencies,
        },
        expectedVersion: data.expectedVersion,
      });

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[saveChildAssessment] Firebase persistence error:", error instanceof Error ? error.name : "unknown error");
      throw new Error(`Could not save that check-in: ${message}`);
    }
  });

/**
 * Gate B: Scenario load logic, exported for direct server-side invocation.
 *
 * The TanStack Start Vite plugin replaces `createServerFn().handler()` bodies
 * with transport stubs, so the handler itself cannot be executed under Vitest.
 * Keeping the logic in a plain exported function lets integration tests drive
 * the real authorization, validation and persistence path.
 */
export async function loadChildScenarioForContext(
  context: AuthenticatedChildContext,
  data: { scenarioId: string },
) {
  // Gate B: Validate child context state
  const contextCheck = validateChildContext(context);
  if (!contextCheck.valid) throw new Error(contextCheck.error || "Invalid context");

  // Gate B: Validate scenario exists
  const definition = getScenarioDefinition(data.scenarioId);
  if (!definition) throw new Error("That story is not available.");

  // Gate B: Validate scenario is in the current track
  if (!trackScenarioExists(data.scenarioId)) {
    throw new Error("That story is not available in this journey.");
  }

  // Gate B: Use enhanced definition to validate any loaded state
  const enhanced = getEnhancedScenarioDefinition(data.scenarioId);
  if (!enhanced) throw new Error("Scenario definition unavailable.");

  // Gate B: Load session from Firebase
  const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
  const { FirebaseScenarioRepository } = await import(
    "@/lib/backend/firebase/repositories.server"
  );
  const db = getFirebaseAdminDb();
  const repo = new FirebaseScenarioRepository(db, context.familyId);

  const session = await repo.loadSession(context.childId, data.scenarioId);

  // Gate B: If state exists, validate it before returning
  if (session && session.state) {
    const stateCheck = validateScenarioStateBounds(session.state);
    if (!stateCheck.valid) {
      console.warn(`[Gate B] Invalid saved state: ${stateCheck.error}`);
      // Return a safe engine state; do not persist over the invalid document.
      return {
        sessionId: data.scenarioId,
        state: createInitialState(definition),
        version: session.version,
        definition,
      };
    }
  }

  return {
    sessionId: session ? data.scenarioId : null,
    state: session?.state ?? createInitialState(definition),
    version: session?.version ?? 0,
    definition,
  };
}

export const loadChildScenario = createServerFn({ method: "GET" })
  .validator(z.object({ scenarioId: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    // Gate B: Use explicit authenticated child context (G3 integration)
    const context = await getCurrentChildContext();
    return await loadChildScenarioForContext(context, data);
  });

export const saveChildScenario = createServerFn({ method: "POST" })
  .validator(scenarioStateInput)
  .handler(async ({ data }) => {
    // Gate B: Use explicit authenticated child context (G3 integration)
    const context = await getCurrentChildContext();
    return await saveChildScenarioForContext(context, data);
  });

/**
 * Gate B: Scenario save logic, exported for direct server-side invocation.
 * See `loadChildScenarioForContext` for why this is split out of the handler.
 */
export async function saveChildScenarioForContext(
  context: AuthenticatedChildContext,
  data: ScenarioStateInput,
) {
  // Gate B: Validate child context state
  const contextCheck = validateChildContext(context);
  if (!contextCheck.valid) throw new Error(contextCheck.error || "Invalid context");

  // Gate B: Validate scenario exists
  const definition = getScenarioDefinition(data.scenarioId);
  if (!definition) throw new Error("That story is not available.");

  // Gate B: Validate scenario is in the current track
  if (!trackScenarioExists(data.scenarioId)) {
    throw new Error("That story is not available in this journey.");
  }

  // Gate B: Get enhanced definition for validation
  const enhanced = getEnhancedScenarioDefinition(data.scenarioId);
  if (!enhanced) throw new Error("Scenario definition unavailable.");

  // Gate B: Validate submitted state bounds
  const boundsCheck = validateScenarioStateBounds(data);
  if (!boundsCheck.valid) throw new Error(boundsCheck.error || "Invalid story state");

  // Gate B: Validate submitted day
  const dayCheck = validateDay(enhanced, data.day);
  if (!dayCheck.valid) throw new Error(dayCheck.error);

  // Gate B: Validate submitted node is reachable
  const nodeCheck = validateNodeReachability(enhanced, data.nodeId);
  if (!nodeCheck.valid) throw new Error(nodeCheck.error);

  // Gate B: Validate all choices in decision history
  for (let i = 0; i < data.decisions.length; i++) {
    const decision = data.decisions[i];
    if (!decision || typeof decision !== "object") continue;

    const choiceCheck = validateChoice(enhanced, decision.nodeId, decision.choiceId);
    if (!choiceCheck.valid) {
      throw new Error(`Decision ${i}: ${choiceCheck.error}`);
    }
  }

  // Gate B: Validate ending ID if present
  if (data.endingId && !enhanced.endingIds.has(data.endingId)) {
    throw new Error("Invalid story ending");
  }

  // Gate B: Verify state was produced by scenario engine (integrity check)
  // Replay decisions through engine and compare to submitted state
  const integrityCheck = verifyScenarioStateConsistency(definition, data);
  if (!integrityCheck.valid) {
    throw new Error(`Story state integrity violation: ${integrityCheck.error}`);
  }

  // Use engine-derived state as authoritative (prevents client fabrication)
  // The integrity check always returns a derived state on success; if it is
  // missing we cannot vouch for the submission, so refuse to persist it.
  const authoritative = integrityCheck.derivedState;
  if (!authoritative) {
    throw new Error("Story state could not be verified.");
  }

  // Gate B: Persist to Firebase with optimistic concurrency control
  const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
  const { FirebaseScenarioRepository } = await import(
    "@/lib/backend/firebase/repositories.server"
  );
  const db = getFirebaseAdminDb();
  const repo = new FirebaseScenarioRepository(db, context.familyId);

  // Save with version checking (optimistic concurrency)
  try {
    const result = await repo.saveSession(
      context.childId,
      data.scenarioId,
      authoritative,
      data.expectedVersion,
    );

    return { sessionId: data.scenarioId, version: result.version, status: result.status };
  } catch (error) {
    // Handle version conflicts (client should reload)
    if (error instanceof Error && error.message.includes("Version conflict")) {
      throw new Error(
        "SCENARIO_VERSION_CONFLICT: Story state was modified elsewhere. Reload to recover your progress.",
      );
    }
    throw error;
  }
}
