-- Lightweight product feedback: separate from learning results and explicitly audience-scoped.
ALTER TABLE public.feedback
  ADD COLUMN audience text NOT NULL DEFAULT 'parent'
    CHECK (audience IN ('child', 'parent')),
  ADD COLUMN experience_key text NOT NULL DEFAULT 'general',
  ADD COLUMN answers jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_feedback_audience_created
  ON public.feedback(audience, created_at DESC);
CREATE INDEX idx_feedback_experience
  ON public.feedback(experience_key);

-- Product-owner/testing access is granted by inserting an authenticated user id here
-- through a trusted migration or server-side admin operation.
CREATE TABLE public.feedback_reviewers (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feedback_reviewers TO authenticated;
GRANT ALL ON public.feedback_reviewers TO service_role;
GRANT UPDATE, DELETE ON public.feedback TO authenticated;
ALTER TABLE public.feedback_reviewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviewers can see own reviewer row" ON public.feedback_reviewers
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_feedback_reviewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feedback_reviewers
    WHERE user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_feedback_reviewer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_feedback_reviewer() TO authenticated;

DROP POLICY IF EXISTS "own feedback select" ON public.feedback;
CREATE POLICY "own or reviewer feedback select" ON public.feedback
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_feedback_reviewer());

DROP POLICY IF EXISTS "own feedback insert" ON public.feedback;
CREATE POLICY "own feedback insert" ON public.feedback
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (child_profile_id IS NULL OR public.owns_child_profile(child_profile_id))
);

-- Feedback is immutable to normal clients after submission.
DROP POLICY IF EXISTS "own feedback update" ON public.feedback;
DROP POLICY IF EXISTS "own feedback delete" ON public.feedback;
CREATE POLICY "reviewers manage feedback" ON public.feedback
FOR UPDATE TO authenticated
USING (public.is_feedback_reviewer())
WITH CHECK (public.is_feedback_reviewer());
CREATE POLICY "reviewers delete feedback" ON public.feedback
FOR DELETE TO authenticated
USING (public.is_feedback_reviewer());
