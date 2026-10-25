-- Migration 004: Production Authentication, Multi-Staff Concurrent Sessions, and Organization Data Isolation

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add organization_id to core operational tables
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE status_history 
ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- App Accounts
CREATE TABLE IF NOT EXISTS app_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'STAFF',
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App Sessions (Per-device independent tokens, no global logout interference)
CREATE TABLE IF NOT EXISTS app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  identifier VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_token ON app_sessions(token);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON app_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_dogs_org ON dogs(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_org ON owners(organization_id);
