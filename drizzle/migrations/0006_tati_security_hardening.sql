-- Defense-in-depth constraints and helper-function privileges.
-- NOT VALID preserves existing MVP rows while enforcing rules for new writes.

REVOKE EXECUTE ON FUNCTION public.owns_child(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_child(uuid) TO authenticated;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_full_name_length_check
  CHECK (full_name IS NULL OR length(full_name) BETWEEN 1 AND 120) NOT VALID;

ALTER TABLE public.families
  ADD CONSTRAINT families_name_length_check
  CHECK (length(name) BETWEEN 1 AND 120) NOT VALID;

ALTER TABLE public.family_members
  ADD CONSTRAINT family_members_role_check
  CHECK (role IN ('parent', 'guardian')) NOT VALID;

ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_name_length_check
  CHECK (length(name) BETWEEN 1 AND 120) NOT VALID,
  ADD CONSTRAINT child_profiles_age_check
  CHECK (age BETWEEN 8 AND 12) NOT VALID,
  ADD CONSTRAINT child_profiles_onboarding_step_check
  CHECK (onboarding_step BETWEEN 0 AND 100) NOT VALID;

ALTER TABLE public.journey_progress
  ADD CONSTRAINT journey_progress_score_check
  CHECK ((score IS NULL OR score >= 0) AND (max_score IS NULL OR max_score >= 0)) NOT VALID,
  ADD CONSTRAINT journey_progress_details_size_check
  CHECK (pg_column_size(details) <= 65536) NOT VALID;

ALTER TABLE public.assessment_attempts
  ADD CONSTRAINT assessment_attempts_points_check
  CHECK (points >= 0 AND max_points >= 0) NOT VALID;

ALTER TABLE public.assessment_responses
  ADD CONSTRAINT assessment_responses_points_check
  CHECK (points >= 0 AND max_points >= 0) NOT VALID;

ALTER TABLE public.scenario_sessions
  ADD CONSTRAINT scenario_sessions_day_check
  CHECK (day_number BETWEEN 1 AND 366) NOT VALID,
  ADD CONSTRAINT scenario_sessions_state_size_check
  CHECK (pg_column_size(state) <= 131072) NOT VALID;

ALTER TABLE public.scenario_decisions
  ADD CONSTRAINT scenario_decisions_day_check
  CHECK (day_number BETWEEN 1 AND 366) NOT VALID,
  ADD CONSTRAINT scenario_decisions_details_size_check
  CHECK (pg_column_size(details) <= 65536) NOT VALID;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_message_length_check
  CHECK (message IS NULL OR length(message) <= 5000) NOT VALID,
  ADD CONSTRAINT feedback_answers_size_check
  CHECK (pg_column_size(answers) <= 65536) NOT VALID;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_event_key_check
  CHECK (event_key IS NULL OR (length(event_key) <= 128 AND event_key !~ '@')) NOT VALID,
  ADD CONSTRAINT analytics_entity_id_check
  CHECK (entity_id IS NULL OR (length(entity_id) <= 128 AND entity_id !~ '@')) NOT VALID;

-- Analytics must remain a reviewer-only read surface; the table privilege is
-- intentionally narrowed because inserts are the only client operation.
REVOKE SELECT, UPDATE, DELETE ON public.analytics_events FROM authenticated;
GRANT INSERT ON public.analytics_events TO authenticated;
