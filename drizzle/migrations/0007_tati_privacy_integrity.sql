-- Reduce internal account-identifier exposure and make scenario decisions idempotent.
DROP POLICY IF EXISTS "read own membership rows" ON public.family_members;
CREATE POLICY "read own membership row" ON public.family_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

ALTER TABLE public.scenario_decisions
  ADD CONSTRAINT scenario_decisions_session_node_day_key
  UNIQUE (session_id, node_id, day_number);
