-- =====================================================================
-- Oscar Dog Hotel V2 — complete database schema for a NEW Supabase project
-- Run once in: Supabase Dashboard -> SQL Editor (new V2 project ONLY).
--
-- Consolidates backend/migrations 001-006 and adds what the app needs but
-- the V1 repo never contained: the login RPC functions, grants, RLS and
-- the realtime publication.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- 1. Core tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shared_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL DEFAULT 'Staff Member',
  avatar_url VARCHAR(255) DEFAULT '/assets/user_avatar.png',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(150) NOT NULL,
  normalized_phone VARCHAR(50) NOT NULL,          -- not unique (V1 migration 006)
  display_phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  weight_kg NUMERIC(5, 2),
  avatar_id VARCHAR(20) NOT NULL CHECK (avatar_id IN ('avatar_1','avatar_2','avatar_3','avatar_4','avatar_5')),
  special_notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE RESTRICT,
  check_in_at TIMESTAMPTZ NOT NULL,
  check_out_at TIMESTAMPTZ NOT NULL,
  current_status VARCHAR(30) NOT NULL CHECK (current_status IN ('RECEIVED','IN_HOTEL','UPCOMING','COMPLETE','CANCEL','OUTGOING')),
  services JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  delivery_method JSONB DEFAULT NULL,
  is_outgoing_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_booking_dates CHECK (check_out_at > check_in_at)
);

CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL CHECK (new_status IN ('RECEIVED','IN_HOTEL','UPCOMING','COMPLETE','CANCEL','OUTGOING')),
  effective_at TIMESTAMPTZ NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_account_id UUID REFERENCES public.shared_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.application_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  hotel_timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Nicosia',
  version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
  build VARCHAR(20) NOT NULL DEFAULT '20261025',
  environment VARCHAR(50) NOT NULL DEFAULT 'Production',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.application_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_account_id UUID REFERENCES public.shared_accounts(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_identifier VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED')),
  file_size_bytes BIGINT,
  failure_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

-- App accounts & per-device sessions (custom auth used by the mobile app)
CREATE TABLE IF NOT EXISTS public.app_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('STAFF','NORMAL')),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  account_id UUID NOT NULL REFERENCES public.app_accounts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  identifier VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dogs_owner_id ON public.dogs(owner_id);
CREATE INDEX IF NOT EXISTS idx_dogs_is_archived ON public.dogs(is_archived);
CREATE INDEX IF NOT EXISTS idx_dogs_name_lower ON public.dogs(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_dogs_org ON public.dogs(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_normalized_phone ON public.owners(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_owners_name_lower ON public.owners(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_owners_org ON public.owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dog_id ON public.bookings(dog_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_at ON public.bookings(check_in_at);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_at ON public.bookings(check_out_at);
CREATE INDEX IF NOT EXISTS idx_bookings_current_status ON public.bookings(current_status);
CREATE INDEX IF NOT EXISTS idx_bookings_dog_overlap ON public.bookings(dog_id, check_in_at, check_out_at);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON public.bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_status_history_booking_id ON public.status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_status_history_effective_at ON public.status_history(effective_at);
CREATE INDEX IF NOT EXISTS idx_status_history_org ON public.status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_account ON public.app_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON public.app_sessions(expires_at);

-- ---------------------------------------------------------------------
-- 3. Auth RPC functions (called by src/services/api.ts)
--    Response shapes match exactly what the app expects.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._app_account_json(a public.app_accounts)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', a.id, 'identifier', a.identifier, 'displayName', a.display_name,
    'role', a.role, 'organizationId', a.organization_id);
$$;

CREATE OR REPLACE FUNCTION public._app_new_session(a public.app_accounts)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_token text := encode(extensions.gen_random_bytes(32), 'hex');
BEGIN
  DELETE FROM public.app_sessions WHERE expires_at < NOW();
  INSERT INTO public.app_sessions (token, account_id, organization_id, identifier, role, expires_at)
  VALUES (v_token, a.id, a.organization_id, a.identifier, a.role, NOW() + INTERVAL '30 days');
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.app_login(p_identifier text, p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE a public.app_accounts;
BEGIN
  SELECT * INTO a FROM public.app_accounts WHERE lower(identifier) = lower(trim(p_identifier)) LIMIT 1;
  IF a.id IS NULL OR a.password_hash <> extensions.crypt(p_password, a.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid account number or password.');
  END IF;
  RETURN jsonb_build_object('success', true, 'token', public._app_new_session(a), 'account', public._app_account_json(a));
END $$;

CREATE OR REPLACE FUNCTION public.app_create_account(p_identifier text, p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE a public.app_accounts; v_ident text := trim(p_identifier);
BEGIN
  IF length(v_ident) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid mobile number or email.');
  END IF;
  IF length(coalesce(p_password, '')) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.app_accounts WHERE lower(identifier) = lower(v_ident)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An account with this mobile/email already exists.');
  END IF;
  -- Self-registered users get their own private organization.
  INSERT INTO public.app_accounts (identifier, password_hash, display_name, role, organization_id)
  VALUES (v_ident, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), v_ident, 'NORMAL', gen_random_uuid())
  RETURNING * INTO a;
  RETURN jsonb_build_object('success', true, 'token', public._app_new_session(a), 'account', public._app_account_json(a));
END $$;

CREATE OR REPLACE FUNCTION public.app_validate_session(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE a public.app_accounts;
BEGIN
  SELECT acc.* INTO a FROM public.app_sessions s JOIN public.app_accounts acc ON acc.id = s.account_id
  WHERE s.token = p_token AND s.expires_at > NOW() LIMIT 1;
  IF a.id IS NULL THEN RETURN jsonb_build_object('valid', false); END IF;
  RETURN jsonb_build_object('valid', true, 'account', public._app_account_json(a));
END $$;

CREATE OR REPLACE FUNCTION public.app_logout(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.app_sessions WHERE token = p_token;
  RETURN jsonb_build_object('success', true);
END $$;

-- Admin-only helper to create a STAFF login (run from SQL Editor, not callable by the app):
--   SELECT public.app_admin_create_staff('1001', 'StrongPassword!', 'Front Desk');
CREATE OR REPLACE FUNCTION public.app_admin_create_staff(p_identifier text, p_password text, p_display_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.app_accounts (identifier, password_hash, display_name, role)
  VALUES (trim(p_identifier), extensions.crypt(p_password, extensions.gen_salt('bf', 10)), p_display_name, 'STAFF')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public._app_account_json(public.app_accounts) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._app_new_session(public.app_accounts) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_admin_create_staff(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_account(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_validate_session(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_logout(text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Row Level Security
--    Credentials/session tables: no direct access at all (RPC only).
--    Operational tables: open to the app key, same trust model as V1
--    (the app filters by organization_id). See SETUP_V2.md -> "Security
--    roadmap" for moving this to server-enforced tenant isolation.
-- ---------------------------------------------------------------------
ALTER TABLE public.app_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history      ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.app_accounts, public.app_sessions, public.shared_accounts,
              public.audit_logs, public.backup_logs FROM anon, authenticated;

DROP POLICY IF EXISTS settings_read ON public.application_settings;
CREATE POLICY settings_read ON public.application_settings FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['owners','dogs','bookings','status_history'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS app_access ON public.%I', t);
    EXECUTE format('CREATE POLICY app_access ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
  END LOOP;
END $$;
GRANT SELECT ON public.application_settings TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Realtime (multi-device sync used by AppContext.tsx)
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dogs','bookings','owners','status_history'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
