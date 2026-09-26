import { supabase } from "@/integrations/supabase/client";

export const ANALYTICS_EVENTS = [
  "signup_completed",
  "child_profile_created",
  "pre_assessment_started",
  "pre_assessment_completed",
  "lesson_started",
  "lesson_completed",
  "scenario_started",
  "scenario_choice_made",
  "scenario_resumed",
  "scenario_completed",
  "journey_completed",
  "post_assessment_completed",
  "parent_dashboard_viewed",
  "parent_conversation_prompt_viewed",
  "child_feedback_submitted",
  "parent_feedback_submitted",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export type AnalyticsEvent = {
  id: string;
  event_name: AnalyticsEventName;
  actor_id: string;
  child_profile_id: string | null;
  entity_id: string | null;
  event_key: string | null;
  occurred_at: string;
};

export async function trackEvent(
  eventName: AnalyticsEventName,
  input: {
    childProfileId?: string | null;
    entityId?: string | null;
    eventKey?: string | null;
  } = {},
): Promise<string | undefined> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return undefined;

    const safeEntityId = input.entityId?.slice(0, 128) ?? null;
    const safeEventKey = input.eventKey?.slice(0, 128) ?? null;

    const { data, error } = await supabase
      .from("analytics_events")
      .insert({
        event_name: eventName,
        actor_id: userData.user.id,
        child_profile_id: input.childProfileId ?? null,
        entity_id: safeEntityId,
        event_key: safeEventKey,
      })
      .select("id")
      .maybeSingle();
    if (error) return undefined;
    return data?.id;
  } catch {
    // Product analytics must never interrupt learning or account flows.
    return undefined;
  }
}

export async function getAnalyticsForReview(): Promise<AnalyticsEvent[]> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("id, event_name, actor_id, child_profile_id, entity_id, event_key, occurred_at")
    .order("occurred_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AnalyticsEvent[];
}
