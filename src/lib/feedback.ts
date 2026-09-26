import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export type FeedbackAudience = "child" | "parent";

export type FeedbackSubmission = {
  audience: FeedbackAudience;
  experienceKey: string;
  childProfileId?: string | null;
  context: string;
  answers: Record<string, string | number | boolean | null>;
  message?: string;
  rating?: number;
};

export type FeedbackRow = {
  id: string;
  audience: FeedbackAudience;
  experience_key: string;
  child_profile_id: string | null;
  context: string;
  answers: Record<string, unknown>;
  rating: number | null;
  message: string | null;
  user_id: string;
  created_at: string;
};

export async function submitFeedback(input: FeedbackSubmission) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Please sign in before sending feedback.");

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: userData.user.id,
      audience: input.audience,
      experience_key: input.experienceKey,
      child_profile_id: input.childProfileId ?? null,
      context: input.context,
      answers: input.answers,
      message: input.message?.trim() || null,
      rating: input.rating ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  void trackEvent(
    input.audience === "child" ? "child_feedback_submitted" : "parent_feedback_submitted",
    {
      childProfileId: input.childProfileId ?? null,
      eventKey: data?.id ?? null,
    },
  );
}

export async function getFeedbackForReview(): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, audience, experience_key, child_profile_id, context, answers, rating, message, user_id, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FeedbackRow[];
}
