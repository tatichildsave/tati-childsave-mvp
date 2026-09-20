-- Align persisted learner state with the MVP architecture and close cross-family integrity gaps.

-- Ownership references should resolve to authenticated user profiles.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.families
  ADD CONSTRAINT families_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.family_members
  ADD CONSTRAINT family_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owns_family(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owns_child_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_child_profile(uuid) TO authenticated;

-- Ownership columns must not be reassigned by an ordinary client update.
CREATE OR REPLACE FUNCTION public.prevent_ownership_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS families_protect_created_by ON public.families;
CREATE TRIGGER families_protect_created_by
BEFORE UPDATE ON public.families
FOR EACH ROW EXECUTE FUNCTION public.prevent_ownership_change();

DROP TRIGGER IF EXISTS child_profiles_protect_created_by ON public.child_profiles;
CREATE TRIGGER child_profiles_protect_created_by
BEFORE UPDATE ON public.child_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_ownership_change();

-- The persisted learner journey is the single progress table.
ALTER TABLE public.learning_progress RENAME TO journey_progress;
ALTER INDEX IF EXISTS public.idx_learning_progress_child RENAME TO idx_journey_progress_child;

-- Prevent a response or decision from attaching to a different learner's parent row.
ALTER TABLE public.assessment_attempts
  ADD CONSTRAINT assessment_attempts_id_child_key UNIQUE (id, child_profile_id);

ALTER TABLE public.assessment_responses
  ADD CONSTRAINT assessment_responses_attempt_child_fkey
  FOREIGN KEY (attempt_id, child_profile_id)
  REFERENCES public.assessment_attempts(id, child_profile_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.scenario_sessions
  ADD CONSTRAINT scenario_sessions_id_child_key UNIQUE (id, child_profile_id);

ALTER TABLE public.scenario_decisions
  ADD CONSTRAINT scenario_decisions_session_child_fkey
  FOREIGN KEY (session_id, child_profile_id)
  REFERENCES public.scenario_sessions(id, child_profile_id)
  ON DELETE CASCADE
  NOT VALID;

CREATE INDEX IF NOT EXISTS assessment_responses_attempt_child_idx
  ON public.assessment_responses (attempt_id, child_profile_id);
CREATE INDEX IF NOT EXISTS scenario_decisions_session_child_idx
  ON public.scenario_decisions (session_id, child_profile_id);

-- Learner competency state; the competency catalogue remains application content.
CREATE TABLE public.learner_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  competency_id text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'developing',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_profile_id, competency_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_competencies TO authenticated;
GRANT ALL ON public.learner_competencies TO service_role;
ALTER TABLE public.learner_competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family manages learner competencies" ON public.learner_competencies
FOR ALL TO authenticated
USING (public.owns_child_profile(child_profile_id))
WITH CHECK (public.owns_child_profile(child_profile_id));
CREATE INDEX idx_learner_competencies_child
  ON public.learner_competencies(child_profile_id);
CREATE TRIGGER learner_competencies_set_updated_at
BEFORE UPDATE ON public.learner_competencies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Parent-facing derived notes are still private learner state, not public content.
CREATE TABLE public.parent_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_insights TO authenticated;
GRANT ALL ON public.parent_insights TO service_role;
ALTER TABLE public.parent_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family manages parent insights" ON public.parent_insights
FOR ALL TO authenticated
USING (public.owns_child_profile(child_profile_id))
WITH CHECK (
  public.owns_child_profile(child_profile_id)
  AND created_by = auth.uid()
);
CREATE INDEX idx_parent_insights_child_created
  ON public.parent_insights(child_profile_id, created_at DESC);

-- Feedback may only reference a child in the submitter's family.
DROP POLICY IF EXISTS "own feedback insert" ON public.feedback;
CREATE POLICY "own feedback insert" ON public.feedback
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (child_profile_id IS NULL OR public.owns_child_profile(child_profile_id))
);

-- Keep the legacy children/progress_events tables readable only through their existing RLS;
-- new application code must use child_profiles/journey_progress instead.
