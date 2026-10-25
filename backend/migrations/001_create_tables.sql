-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Shared Staff Accounts
CREATE TABLE IF NOT EXISTS shared_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL DEFAULT 'Staff Member',
  avatar_url VARCHAR(255) DEFAULT '/assets/user_avatar.png',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Owners Table
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  normalized_phone VARCHAR(50) NOT NULL,
  display_phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Dogs Table
CREATE TABLE IF NOT EXISTS dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  weight_kg NUMERIC(5, 2),
  avatar_id VARCHAR(20) NOT NULL CHECK (avatar_id IN ('avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5')),
  special_notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE RESTRICT,
  check_in_at TIMESTAMPTZ NOT NULL,
  check_out_at TIMESTAMPTZ NOT NULL,
  current_status VARCHAR(30) NOT NULL CHECK (current_status IN ('RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING')),
  services JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_outgoing_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_booking_dates CHECK (check_out_at > check_in_at)
);

-- 5. Status History Table
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL CHECK (new_status IN ('RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING')),
  effective_at TIMESTAMPTZ NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_account_id UUID REFERENCES shared_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Application Settings Table
CREATE TABLE IF NOT EXISTS application_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  hotel_timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Nicosia',
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  build VARCHAR(20) NOT NULL DEFAULT '20260913',
  environment VARCHAR(50) NOT NULL DEFAULT 'Production',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_account_id UUID REFERENCES shared_accounts(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Backup Logs Table
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_identifier VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
  file_size_bytes BIGINT,
  failure_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
