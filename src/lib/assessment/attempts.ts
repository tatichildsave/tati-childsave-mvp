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
  // Phase 7C4B: Temporarily disable parent assessment submissions
  // Child assessments are now persisted via Firebase (saveChildAssessment)
  // Parent/facilitator submissions require Phase 7C4C server-side migration
  // This prevents the legacy Supabase path from bypassing Firebase authorization
  throw new Error(
    "Parent assessment submissions are temporarily disabled during the Firebase migration phase. " +
      "This feature will be restored with full server-side authorization in Phase 7C4C.",
  );
}
