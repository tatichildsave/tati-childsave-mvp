-- Privacy-minimal product analytics. No names, emails, answers, or free text are stored here.
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL CHECK (event_name IN (
    'signup_completed',
    'child_profile_created',
    'pre_assessment_started',
    'pre_assessment_completed',
    'lesson_started',
    'lesson_completed',
    'scenario_started',
    'scenario_choice_made',
    'scenario_resumed',
    'scenario_completed',
    'journey_completed',
    'post_assessment_completed',
    'parent_dashboard_viewed',
    'parent_conversation_prompt_viewed',
    'child_feedback_submitted',
    'parent_feedback_submitted'
  )),
  actor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_profile_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  entity_id text,
  event_key text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_name, actor_id, child_profile_id, event_key)
);

GRANT INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users record their own analytics" ON public.analytics_events
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (child_profile_id IS NULL OR public.owns_child_profile(child_profile_id))
);

CREATE POLICY "reviewers inspect analytics" ON public.analytics_events
FOR SELECT TO authenticated
USING (public.is_feedback_reviewer());

CREATE INDEX idx_analytics_events_name_time
  ON public.analytics_events(event_name, occurred_at DESC);
CREATE INDEX idx_analytics_events_child_name
  ON public.analytics_events(child_profile_id, event_name);
CREATE INDEX idx_analytics_events_actor_name
  ON public.analytics_events(actor_id, event_name);

-- Count confirmed account creation even when signup requires email confirmation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.analytics_events (event_name, actor_id, event_key)
  VALUES ('signup_completed', NEW.id, NEW.id::text)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
