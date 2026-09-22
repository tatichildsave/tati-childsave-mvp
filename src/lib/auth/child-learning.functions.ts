import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAssessmentDefinition } from "@/lib/assessment/registry";
import { optionPoints, questionMaxPoints } from "@/lib/assessment/engine";
import { getTrack } from "@/lib/learning/track";
import { getLessonById } from "@/lib/lessons/registry";
import { getScenarioDefinition } from "@/lib/scenario/registry";
import { validateChildSession } from "./child-identity.server";

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

async function currentChildId(): Promise<string> {
  const token = getCookie(COOKIE_NAME);
  const session = token ? await validateChildSession(token) : null;
  if (!session) throw new Error("Child session required.");
  return session.child_profile_id;
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
    await currentChildId();
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
    const childId = await currentChildId();
    const definition = getAssessmentDefinition(data.assessmentId);
    if (!definition) throw new Error("That check-in is not available.");
    const { data: attempt, error } = await supabase
      .from("assessment_attempts")
      .upsert(
        {
          child_profile_id: childId,
          assessment_id: definition.id,
          assessment_type: definition.assessmentType,
          points: data.points,
          max_points: data.maxPoints,
          competency_scores: data.competencyScores,
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
    const childId = await currentChildId();
    const definition = getScenarioDefinition(data.scenarioId);
    if (!definition) throw new Error("That story is not available.");
    const { data: row, error } = await supabase
      .from("scenario_sessions")
      .select("id, state")
      .eq("child_profile_id", childId)
      .eq("scenario_id", data.scenarioId)
      .maybeSingle();
    if (error) throw error;
    return { sessionId: row?.id ?? null, state: row?.state ?? null, definition };
  });

export const saveChildScenario = createServerFn({ method: "POST" })
  .validator(scenarioStateInput)
  .handler(async ({ data }) => {
    const childId = await currentChildId();
    const definition = getScenarioDefinition(data.scenarioId);
    if (!definition) throw new Error("That story is not available.");
    const { data: session, error } = await supabase
      .from("scenario_sessions")
      .upsert(
        {
          child_profile_id: childId,
          scenario_id: data.scenarioId,
          state: data,
          current_node_id: data.nodeId,
          day_number: data.day,
          status: data.phase === "complete" ? "completed" : "in_progress",
          completed_at: data.phase === "complete" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "child_profile_id,scenario_id" },
      )
      .select("id")
      .single();
    if (error || !session) throw new Error("Could not save that story.");
    const lastDecision = data.decisions[data.decisions.length - 1];
    if (lastDecision && typeof lastDecision === "object") {
      const decision = lastDecision as Record<string, unknown>;
      const { error: decisionError } = await supabase.from("scenario_decisions").upsert(
        {
          session_id: session.id,
          child_profile_id: childId,
          node_id: String(decision["nodeId"] ?? data.nodeId),
          choice_id: String(decision["choiceId"] ?? "unknown"),
          day_number: Number(decision["day"] ?? data.day),
          details: decision,
        },
        { onConflict: "session_id,node_id,day_number", ignoreDuplicates: true },
      );
      if (decisionError) throw decisionError;
    }
    return { sessionId: session.id };
  });
