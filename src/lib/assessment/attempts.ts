// Stores a finished check-in as an attempt plus one row per answer, so the
// parent dashboard can compare the first and last check-ins competency by
// competency. The child never sees these numbers.

import { supabase } from "@/integrations/supabase/client";
import { optionPoints, questionMaxPoints } from "./engine";
import type { AssessmentDefinition, AssessmentResult } from "./types";

export async function saveAssessmentAttempt(
  childId: string,
  definition: AssessmentDefinition,
  result: AssessmentResult,
): Promise<void> {
  const competencyScores = Object.fromEntries(
    result.competencies.map((c) => [c.competency, { points: c.points, maxPoints: c.maxPoints }]),
  );

  const { data, error } = await supabase
    .from("assessment_attempts")
    .upsert(
      {
        child_profile_id: childId,
        assessment_id: result.assessmentId,
        assessment_type: result.assessmentType,
        points: result.points,
        max_points: result.maxPoints,
        competency_scores: competencyScores as never,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_profile_id,assessment_id" },
    )
    .select("id")
    .maybeSingle();
  if (error || !data?.id) return;

  const rows = definition.questions
    .filter((q) => result.responses[q.id])
    .map((q) => ({
      attempt_id: data.id,
      child_profile_id: childId,
      question_id: q.id,
      competency: q.competency,
      option_id: result.responses[q.id] ?? null,
      points: optionPoints(q, result.responses[q.id]),
      max_points: questionMaxPoints(q),
    }));
  if (rows.length === 0) return;
  await supabase
    .from("assessment_responses")
    .upsert(rows, { onConflict: "attempt_id,question_id" });
}
