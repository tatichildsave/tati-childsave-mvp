-- Corrected TATI identity foundation for the deployed schema.
-- Application users are Supabase Auth identities (auth.users.id).
-- Child learners remain child_profiles plus TATI credentials/sessions and do not
-- require an auth.users row or a user_roles row.
-- This migration is defensive so it is safe after a partially attempted 0008.

-- Server-controlled roles for Supabase Auth users only.
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('parent', 'facilitator', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Public learner identifier. No name, family id, date, or database id is encoded.
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS tati_id text;

UPDATE public.child_profiles
SET tati_id = 'TATI-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8))
WHERE tati_id IS NULL;

ALTER TABLE public.child_profiles
  ALTER COLUMN tati_id SET DEFAULT ('TATI-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8))),
  ALTER COLUMN tati_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.child_profiles'::regclass
      AND conname = 'child_profiles_tati_id_format_check'
  ) THEN
    ALTER TABLE public.child_profiles
      ADD CONSTRAINT child_profiles_tati_id_format_check
      CHECK (tati_id ~ '^TATI-[A-F0-9]{8}$') NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS child_profiles_tati_id_key
  ON public.child_profiles(tati_id);

-- Hashed child PIN material. Child learners do not become Supabase Auth users.
CREATE TABLE IF NOT EXISTS public.child_credentials (
  child_profile_id uuid PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version > 0),
  active boolean NOT NULL DEFAULT true,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.child_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.child_credentials FROM anon, authenticated;
GRANT ALL ON public.child_credentials TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.child_credentials'::regclass
      AND tgname = 'child_credentials_set_updated_at'
  ) THEN
    CREATE TRIGGER child_credentials_set_updated_at
    BEFORE UPDATE ON public.child_credentials
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- Short-lived opaque child sessions. Only the token digest is stored.
CREATE TABLE IF NOT EXISTS public.child_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz
);
ALTER TABLE public.child_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.child_sessions FROM anon, authenticated;
GRANT ALL ON public.child_sessions TO service_role;
CREATE INDEX IF NOT EXISTS child_sessions_child_idx
  ON public.child_sessions(child_profile_id);
CREATE INDEX IF NOT EXISTS child_sessions_active_idx
  ON public.child_sessions(token_hash, expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.user_roles IS 'Trusted role assignments for auth.users identities; client users have no write access.';
COMMENT ON COLUMN public.child_profiles.tati_id IS 'Public opaque learner identifier; never a database id or personal data.';
COMMENT ON TABLE public.child_credentials IS 'Hashed child PIN material; never exposed to clients.';
COMMENT ON TABLE public.child_sessions IS 'Short-lived child-only sessions stored by opaque token digest.';
