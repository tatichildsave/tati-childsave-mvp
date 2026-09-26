import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAssessmentDefinition } from "@/lib/assessment/registry";
import { optionPoints, questionMaxPoints, scoreAssessment } from "@/lib/assessment/engine";
import { getTrack } from "@/lib/learning/track";
import { getLessonById } from "@/lib/lessons/registry";
import { getScenarioDefinition, getEnhancedScenarioDefinition } from "@/lib/scenario/registry";
import type { ScenarioState } from "@/lib/scenario/types";
import { createInitialState, applyChoice, advance } from "@/lib/scenario/engine";
import { validateChildSession } from "./child-identity.server";
import { getAuthenticatedChild } from "./child-session.server";
import type { AuthenticatedChildContext } from "./authorization.server";
import { AuthorizationError } from "./authorization.server";

const COOKIE_NAME = "tati_child_session";
const supabase = supabaseAdmin as unknown as SupabaseClient;

const progressInput = z.object({
  itemType: z.enum(["assessment", "lesson", "scenario", "reflection"]),
  itemId: z.string().min(1).max(128),
  score: z.number().int().min(0).nullable().optional(),
  maxScore: z.number().int().min(0).nullable().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

const scenarioStateInput = z
  .object({
    scenarioId: z.string().min(1).max(128),
    nodeId: z.string().min(1).max(128),
    phase: z.string().min(1).max(32),
    day: z.number().int().min(1).max(366),
    available: z.number().min(0),
    saved: z.number().min(0),
    goalTarget: z.number().min(0),
    decisions: z.array(z.unknown()).max(200),
    updatedAt: z.string().datetime(),
    endingId: z.string().min(1).max(128).optional(),
  })
  .passthrough();

const assessmentInput = z.object({
  assessmentId: z.string().min(1).max(128),
  responses: z.record(z.string(), z.string()),
  points: z.number().int().min(0),
  maxPoints: z.number().int().min(0),
  competencyScores: z.record(z.string(), z.unknown()),
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
 */
async function getCurrentChildContext(): Promise<AuthenticatedChildContext> {
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

async function loadProfile(childId: string): Promise<ChildLearningProfile> {
  const { data, error } = await supabase
    .from("child_profiles")
    .select("id, tati_id, name, age, avatar, tier, curriculum_level")
    .eq("id", childId)
    .single();
  if (error || !data) throw new Error("Child profile unavailable.");
  return data as ChildLearningProfile;
}

function trackItemExists(itemType: string, itemId: string): boolean {
  const track = getTrack("save");
  return track.sequence.some((item) => item.kind === itemType && item.id === itemId);
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
    if (!decision || typeof decision !== "object") {
      return { valid: false, error: `Invalid decision at index ${i}` };
    }

    // @ts-expect-error decision is narrowed to object by typeof guard above
    const d = decision as Record<string, unknown>;
    const decNodeId = d["nodeId"] as string | undefined;
    const decChoiceId = d["choiceId"] as string | undefined;

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

  // Start with initial state
  let verifiedState = createInitialState(definition);

  // Replay all decisions through engine
  for (let i = 0; i < submittedState.decisions.length; i++) {
    const decision = submittedState.decisions[i];

    // Skip if decision is malformed
    if (!decision || typeof decision !== "object") {
      return {
        valid: false,
        error: `Decision ${i}: malformed decision object`,
      };
    }

    const choiceId = (decision as unknown as Record<string, unknown>)["choiceId"];
    if (!choiceId || typeof choiceId !== "string") {
      return {
        valid: false,
        error: `Decision ${i}: missing or invalid choiceId`,
      };
    }

    // Apply choice to get next state
    const nextState = applyChoice(definition, verifiedState, choiceId);

    // Check if choice was actually valid (applyChoice returns unchanged state if choice invalid)
    if (nextState === verifiedState && submittedState.decisions.length > 0) {
      return {
        valid: false,
        error: `Decision ${i}: choice "${choiceId}" could not be applied`,
      };
    }

    // After consequence, advance to next node
    verifiedState = advance(definition, nextState);
  }

  // Compare critical money/competency values
  const moneyMismatch =
    Math.abs(verifiedState.available - submittedState.available) > 0.01 ||
    Math.abs(verifiedState.saved - submittedState.saved) > 0.01;

  if (moneyMismatch) {
    return {
      valid: false,
      error: `State money mismatch: engine produced available=${verifiedState.available}, saved=${verifiedState.saved}, but received available=${submittedState.available}, saved=${submittedState.saved}`,
      derivedState: verifiedState,
    };
  }

  // Compare competencies
  const submittedComps = submittedState.competencies || {};
  const verifiedComps = verifiedState.competencies || {};
  for (const [key, value] of Object.entries(submittedComps)) {
    if (verifiedComps[key as never] !== value) {
      return {
        valid: false,
        error: `Competency mismatch for "${key}": engine produced ${verifiedComps[key as never]}, received ${value}`,
        derivedState: verifiedState,
      };
    }
  }

  // Compare current node
  if (verifiedState.nodeId !== submittedState.nodeId && submittedState.decisions.length > 0) {
    return {
      valid: false,
      error: `Node mismatch: engine produced nodeId="${verifiedState.nodeId}", received "${submittedState.nodeId}"`,
      derivedState: verifiedState,
    };
  }

  // Compare day (must match after decision sequence)
  if (verifiedState.day !== submittedState.day && submittedState.decisions.length > 0) {
    return {
      valid: false,
      error: `Day mismatch: engine produced day=${verifiedState.day}, received day=${submittedState.day}`,
      derivedState: verifiedState,
    };
  }

  // Compare phase
  if (verifiedState.phase !== submittedState.phase) {
    return {
      valid: false,
      error: `Phase mismatch: engine produced phase="${verifiedState.phase}", received "${submittedState.phase}"`,
      derivedState: verifiedState,
    };
  }

  return { valid: true, derivedState: verifiedState };
}

export const getChildLearningData = createServerFn({ method: "GET" }).handler(async () => {
  const childId = await currentChildId();
  const [profile, progressResult, competencyResult, achievementResult, assessmentResult] =
    await Promise.all([
      loadProfile(childId),
      supabase
        .from("journey_progress")
        .select(
          "id, track_id, item_type, item_id, status, score, max_score, details, created_at, updated_at",
        )
        .eq("child_profile_id", childId)
        .eq("track_id", "save")
        .order("updated_at", { ascending: true }),
      supabase
        .from("learner_competencies")
        .select("competency_id, score, level, evidence")
        .eq("child_profile_id", childId),
      supabase
        .from("learner_achievements")
        .select("achievement_id, celebrated, awarded_at")
        .eq("child_profile_id", childId),
      supabase
        .from("assessment_attempts")
        .select(
          "assessment_id, assessment_type, points, max_points, competency_scores, completed_at",
        )
        .eq("child_profile_id", childId),
    ]);
  if (
    progressResult.error ||
    competencyResult.error ||
    achievementResult.error ||
    assessmentResult.error
  ) {
    throw new Error("Learning data unavailable.");
  }
  return {
    profile,
    progress: (progressResult.data ?? []) as ChildLearningData["progress"],
    competencies: (competencyResult.data ?? []) as ChildLearningData["competencies"],
    achievements: (achievementResult.data ?? []) as ChildLearningData["achievements"],
    assessments: (assessmentResult.data ?? []) as ChildLearningData["assessments"],
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
    const childId = await currentChildId();
    if (!trackItemExists(data.itemType, data.itemId))
      throw new Error("That activity is not in this journey.");
    const { error } = await supabase.from("journey_progress").upsert(
      {
        child_profile_id: childId,
        track_id: "save",
        item_type: data.itemType,
        item_id: data.itemId,
        status: "completed",
        score: data.score ?? null,
        max_score: data.maxScore ?? null,
        details: data.details ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_profile_id,item_type,item_id" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const saveChildAssessment = createServerFn({ method: "POST" })
  .validator(assessmentInput)
  .handler(async ({ data }) => {
    // G4: Use authenticated child context for server-side child identity
    const context = await getCurrentChildContext();
    const childId = context.childId;

    const definition = getAssessmentDefinition(data.assessmentId);
    if (!definition) throw new Error("That check-in is not available.");

    // Verify assessment is in the current track
    if (definition.trackId !== "save") {
      throw new Error("That check-in is not available in this track.");
    }

    // Server-side score calculation (client score ignored)
    // This ensures score integrity; client cannot submit arbitrary scores
    const calculatedResult = scoreAssessment(definition, data.responses);

    const { data: attempt, error } = await supabase
      .from("assessment_attempts")
      .upsert(
        {
          child_profile_id: childId,
          assessment_id: definition.id,
          assessment_type: definition.assessmentType,
          points: calculatedResult.points,
          max_points: calculatedResult.maxPoints,
          competency_scores: Object.fromEntries(
            calculatedResult.competencies.map((c) => [
              c.competency,
              { points: c.points, maxPoints: c.maxPoints },
            ]),
          ),
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "child_profile_id,assessment_id" },
      )
      .select("id")
      .single();
    if (error || !attempt) throw new Error("Could not save that check-in.");

    const responses = definition.questions
      .filter((question) => data.responses[question.id])
      .map((question) => ({
        attempt_id: attempt.id,
        child_profile_id: childId,
        question_id: question.id,
        competency: question.competency,
        option_id: data.responses[question.id],
        points: optionPoints(question, data.responses[question.id]),
        max_points: questionMaxPoints(question),
      }));
    if (responses.length > 0) {
      const { error: responseError } = await supabase
        .from("assessment_responses")
        .upsert(responses, { onConflict: "attempt_id,question_id" });
      if (responseError) throw responseError;
    }
    return { ok: true };
  });

export const loadChildScenario = createServerFn({ method: "GET" })
  .validator(z.object({ scenarioId: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    // G5: Use explicit authenticated child context (G3 integration)
    const context = await getCurrentChildContext();

    // G5: Validate child context state
    const contextCheck = validateChildContext(context);
    if (!contextCheck.valid) throw new AuthorizationError(contextCheck.error || "Invalid context");

    // G5: Validate scenario exists
    const definition = getScenarioDefinition(data.scenarioId);
    if (!definition) throw new Error("That story is not available.");

    // G5: Validate scenario is in the current track
    if (!trackItemExists("scenario", data.scenarioId)) {
      throw new Error("That story is not available in this journey.");
    }

    // G5: Use enhanced definition to validate any loaded state
    const enhanced = getEnhancedScenarioDefinition(data.scenarioId);
    if (!enhanced) throw new Error("Scenario definition unavailable.");

    // Fetch session (RLS enforces family isolation)
    const { data: row, error } = await supabase
      .from("scenario_sessions")
      .select("id, state")
      .eq("child_profile_id", context.childId) // Use context.childId (server-derived)
      .eq("scenario_id", data.scenarioId)
      .maybeSingle();

    if (error) throw error;

    // G5: If state exists, validate it before returning
    if (row && row.state) {
      const stateCheck = validateScenarioStateBounds(row.state);
      if (!stateCheck.valid) {
        console.warn(`[G5] Invalid saved state for ${data.scenarioId}: ${stateCheck.error}`);
        // Return null state to force reload; do not persist invalid state
        return { sessionId: row.id, state: null, definition };
      }
    }

    return { sessionId: row?.id ?? null, state: row?.state ?? null, definition };
  });

export const saveChildScenario = createServerFn({ method: "POST" })
  .validator(scenarioStateInput)
  .handler(async ({ data }) => {
    // G5: Use explicit authenticated child context (G3 integration)
    const context = await getCurrentChildContext();

    // G5: Validate child context state
    const contextCheck = validateChildContext(context);
    if (!contextCheck.valid) throw new AuthorizationError(contextCheck.error || "Invalid context");

    // G5: Validate scenario exists
    const definition = getScenarioDefinition(data.scenarioId);
    if (!definition) throw new Error("That story is not available.");

    // G5: Validate scenario is in the current track
    if (!trackItemExists("scenario", data.scenarioId)) {
      throw new Error("That story is not available in this journey.");
    }

    // G5: Get enhanced definition for validation
    const enhanced = getEnhancedScenarioDefinition(data.scenarioId);
    if (!enhanced) throw new Error("Scenario definition unavailable.");

    // G5: Validate submitted state bounds
    const boundsCheck = validateScenarioStateBounds(data);
    if (!boundsCheck.valid) throw new Error(boundsCheck.error || "Invalid story state");

    // G5: Validate submitted day
    const dayCheck = validateDay(enhanced, data.day);
    if (!dayCheck.valid) throw new Error(dayCheck.error);

    // G5: Validate submitted node is reachable
    const nodeCheck = validateNodeReachability(enhanced, data.nodeId);
    if (!nodeCheck.valid) throw new Error(nodeCheck.error);

    // G5: Validate all choices in decision history
    for (let i = 0; i < data.decisions.length; i++) {
      const decision = data.decisions[i];
      if (!decision || typeof decision !== "object") continue;

      const d = decision as Record<string, unknown>;
      const decNodeId = d["nodeId"] as string | undefined;
      const decChoiceId = d["choiceId"] as string | undefined;

      if (decNodeId && decChoiceId) {
        const choiceCheck = validateChoice(enhanced, decNodeId, decChoiceId);
        if (!choiceCheck.valid) {
          throw new Error(`Decision ${i}: ${choiceCheck.error}`);
        }
      }
    }

    // G5: Validate ending ID if present
    if (data.endingId && !enhanced.endingIds.has(data.endingId)) {
      throw new Error("Invalid story ending");
    }

    // G5.1: Verify state was produced by scenario engine (integrity check)
    // Replay decisions through engine and compare to submitted state
    // Cast data to ScenarioState (should have all properties from client)
    const integrityCheck = verifyScenarioStateConsistency(
      definition,
      data as unknown as ScenarioState,
    );
    if (!integrityCheck.valid) {
      throw new Error(`Story state integrity violation: ${integrityCheck.error}`);
    }

    // Use engine-derived state as authoritative (prevents client fabrication)
    // If legitimate client submitted correct state, derived equals submitted (no change)
    // If client attempted fabrication, derived is the real state (replaces fabrication)
    const authoritative = integrityCheck.derivedState || data;

    // All validations passed; persist the authoritative state
    // Use context.childId (server-derived) for ownership enforcement
    const { data: session, error } = await supabase
      .from("scenario_sessions")
      .upsert(
        {
          child_profile_id: context.childId, // Use context.childId (server-derived)
          scenario_id: data.scenarioId,
          state: authoritative,
          current_node_id: authoritative.nodeId,
          day_number: authoritative.day,
          status: authoritative.phase === "complete" ? "completed" : "in_progress",
          completed_at: authoritative.phase === "complete" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "child_profile_id,scenario_id" },
      )
      .select("id")
      .single();

    if (error || !session) throw new Error("Could not save that story.");

    // G5: Record the last decision in audit trail (existing behavior preserved)
    const lastDecision = authoritative.decisions[authoritative.decisions.length - 1];
    if (lastDecision && typeof lastDecision === "object") {
      const decision = lastDecision as Record<string, unknown>;
      const { error: decisionError } = await supabase.from("scenario_decisions").upsert(
        {
          session_id: session.id,
          child_profile_id: context.childId, // Use context.childId (server-derived)
          node_id: String(decision["nodeId"] ?? authoritative.nodeId),
          choice_id: String(decision["choiceId"] ?? "unknown"),
          day_number: Number(decision["day"] ?? authoritative.day),
          details: decision,
        },
        { onConflict: "session_id,node_id,day_number", ignoreDuplicates: true },
      );
      if (decisionError) throw decisionError;
    }

    return { sessionId: session.id };
  });
