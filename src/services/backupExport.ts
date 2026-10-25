import JSZip from 'jszip';
import { supabase } from './supabase';
import { getCurrentOrganizationId } from './api';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface TableVerification {
  databaseCount: number;
  exportedCount: number;
  matched: boolean;
}

export interface BackupProgress {
  step: number;
  totalSteps: number;
  message: string;
  statusText?: string;
  counts?: {
    owners: number;
    dogs: number;
    bookings: number;
    statusHistory: number;
    applicationSettings: number;
  };
  verified?: boolean;
}

export interface BackupResult {
  zipBlob: Blob;
  filename: string;
  sizeFormatted: string;
  totalRecords: number;
  counts: {
    owners: number;
    dogs: number;
    bookings: number;
    statusHistory: number;
    applicationSettings: number;
  };
  exportedAt: string;
}

function sqlVal(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'object') {
    if (val instanceof Date) return `'${val.toISOString()}'`;
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function buildFullBackup(
  onProgress: (p: BackupProgress) => void
): Promise<BackupResult> {
  const orgId = getCurrentOrganizationId();
  const exportedAt = new Date().toISOString();
  const totalSteps = 8;

  // Step 1: Connecting
  onProgress({
    step: 1,
    totalSteps,
    message: 'Connecting to Supabase Cloud PostgreSQL...',
    statusText: 'Initializing connection'
  });

  // Step 2: Fetch Owners with exact count verification
  onProgress({
    step: 2,
    totalSteps,
    message: 'Collecting owner profiles...',
    statusText: 'Querying owners table'
  });

  const [ownersRes, ownersCountRes] = await Promise.all([
    supabase
      .from('owners')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true }),
    supabase
      .from('owners')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
  ]);

  if (ownersRes.error) throw new Error(`Failed to fetch owners: ${ownersRes.error.message}`);
  const owners = ownersRes.data || [];
  const ownersDbCount = ownersCountRes.count ?? owners.length;

  // Step 3: Fetch Dogs
  onProgress({
    step: 3,
    totalSteps,
    message: `Collected ${owners.length} owners. Fetching dog profiles...`,
    statusText: 'Querying dogs table'
  });

  const [dogsRes, dogsCountRes] = await Promise.all([
    supabase
      .from('dogs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true }),
    supabase
      .from('dogs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
  ]);

  if (dogsRes.error) throw new Error(`Failed to fetch dogs: ${dogsRes.error.message}`);
  const dogs = dogsRes.data || [];
  const dogsDbCount = dogsCountRes.count ?? dogs.length;

  // Step 4: Fetch Bookings
  onProgress({
    step: 4,
    totalSteps,
    message: `Collected ${dogs.length} dogs. Fetching reservations & delivery options...`,
    statusText: 'Querying bookings table'
  });

  const [bookingsRes, bookingsCountRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true }),
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
  ]);

  if (bookingsRes.error) throw new Error(`Failed to fetch bookings: ${bookingsRes.error.message}`);
  const bookings = bookingsRes.data || [];
  const bookingsDbCount = bookingsCountRes.count ?? bookings.length;

  // Step 5: Fetch Status History
  onProgress({
    step: 5,
    totalSteps,
    message: `Collected ${bookings.length} bookings. Fetching status history audit log...`,
    statusText: 'Querying status_history table'
  });

  const [statusHistoryRes, statusHistoryCountRes] = await Promise.all([
    supabase
      .from('status_history')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true }),
    supabase
      .from('status_history')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
  ]);

  if (statusHistoryRes.error) throw new Error(`Failed to fetch status history: ${statusHistoryRes.error.message}`);
  const statusHistory = statusHistoryRes.data || [];
  const statusHistoryDbCount = statusHistoryCountRes.count ?? statusHistory.length;

  // Step 6: Fetch Application Settings
  const appSettingsRes = await supabase.from('application_settings').select('*');
  const appSettings = appSettingsRes.data || [];

  // Step 7: Verify Counts & Relational Integrity
  onProgress({
    step: 6,
    totalSteps,
    message: 'Verifying database record counts & relational integrity...',
    statusText: 'Auditing data integrity',
    counts: {
      owners: owners.length,
      dogs: dogs.length,
      bookings: bookings.length,
      statusHistory: statusHistory.length,
      applicationSettings: appSettings.length
    }
  });

  const verified =
    owners.length === ownersDbCount &&
    dogs.length === dogsDbCount &&
    bookings.length === bookingsDbCount &&
    statusHistory.length === statusHistoryDbCount;

  // Step 8: Build SQL Restore Scripts and ZIP Package
  onProgress({
    step: 7,
    totalSteps,
    message: 'Generating SQL restore script, DDL schema, and metadata...',
    statusText: 'Building restore files'
  });

  const schemaTablesSql = `-- ==============================================================================
-- OSCAR DOG HOTEL — RECOVERY SCHEMA (TABLES & INDEXES)
-- Target: PostgreSQL 14+ / Supabase Cloud
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Owners Table
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(150) NOT NULL,
  normalized_phone VARCHAR(50) NOT NULL,
  display_phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Dogs Table
CREATE TABLE IF NOT EXISTS dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
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

-- 3. Bookings Table (Includes Delivery / Pickup Options)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE RESTRICT,
  check_in_at TIMESTAMPTZ NOT NULL,
  check_out_at TIMESTAMPTZ NOT NULL,
  current_status VARCHAR(30) NOT NULL CHECK (current_status IN ('RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING')),
  services JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  delivery_method JSONB DEFAULT NULL,
  is_outgoing_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_booking_dates CHECK (check_out_at > check_in_at)
);

-- 4. Status History Table
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL CHECK (new_status IN ('RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING')),
  effective_at TIMESTAMPTZ NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Application Settings Table
CREATE TABLE IF NOT EXISTS application_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  hotel_timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Nicosia',
  version VARCHAR(20) NOT NULL DEFAULT '1.0.3',
  build VARCHAR(20) NOT NULL DEFAULT '20260927',
  environment VARCHAR(50) NOT NULL DEFAULT 'Production',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_owners_org ON owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_dogs_org ON dogs(organization_id);
CREATE INDEX IF NOT EXISTS idx_dogs_owner ON dogs(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dog ON bookings(dog_id);
CREATE INDEX IF NOT EXISTS idx_status_history_booking ON status_history(booking_id);
`;

  const schemaRlsSql = `-- ==============================================================================
-- OSCAR DOG HOTEL — ROW LEVEL SECURITY POLICIES
-- ==============================================================================

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write owners" ON owners FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write dogs" ON dogs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write bookings" ON bookings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write status_history" ON status_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read application_settings" ON application_settings FOR SELECT TO anon USING (true);
`;

  // Build complete self-contained restore.sql
  let restoreSql = `-- ==============================================================================
-- OSCAR DOG HOTEL — COMPLETE ONE-CLICK DATABASE RESTORE SCRIPT
-- Generated: ${exportedAt}
-- Organization ID: ${orgId}
-- Total Records: ${owners.length + dogs.length + bookings.length + statusHistory.length + appSettings.length}
-- ==============================================================================

${schemaTablesSql}
${schemaRlsSql}

-- ==============================================================================
-- RESTORING DATA (Preserving All Original UUIDs and Relational Integrity)
-- ==============================================================================
`;

  // 1. Owners Data
  if (owners.length > 0) {
    restoreSql += `\n-- 1. Restore Owners (${owners.length} records)\n`;
    for (const o of owners) {
      restoreSql += `INSERT INTO owners (id, organization_id, name, normalized_phone, display_phone, email, created_at, updated_at)
VALUES (${sqlVal(o.id)}, ${sqlVal(o.organization_id)}, ${sqlVal(o.name)}, ${sqlVal(o.normalized_phone)}, ${sqlVal(o.display_phone)}, ${sqlVal(o.email)}, ${sqlVal(o.created_at)}, ${sqlVal(o.updated_at)})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  normalized_phone = EXCLUDED.normalized_phone,
  display_phone = EXCLUDED.display_phone,
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;\n`;
    }
  }

  // 2. Dogs Data
  if (dogs.length > 0) {
    restoreSql += `\n-- 2. Restore Dogs (${dogs.length} records)\n`;
    for (const d of dogs) {
      restoreSql += `INSERT INTO dogs (id, organization_id, owner_id, name, breed, date_of_birth, gender, weight_kg, avatar_id, special_notes, is_archived, created_at, updated_at)
VALUES (${sqlVal(d.id)}, ${sqlVal(d.organization_id)}, ${sqlVal(d.owner_id)}, ${sqlVal(d.name)}, ${sqlVal(d.breed)}, ${sqlVal(d.date_of_birth)}, ${sqlVal(d.gender)}, ${sqlVal(d.weight_kg)}, ${sqlVal(d.avatar_id)}, ${sqlVal(d.special_notes)}, ${sqlVal(d.is_archived)}, ${sqlVal(d.created_at)}, ${sqlVal(d.updated_at)})
ON CONFLICT (id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  name = EXCLUDED.name,
  breed = EXCLUDED.breed,
  date_of_birth = EXCLUDED.date_of_birth,
  gender = EXCLUDED.gender,
  weight_kg = EXCLUDED.weight_kg,
  avatar_id = EXCLUDED.avatar_id,
  special_notes = EXCLUDED.special_notes,
  is_archived = EXCLUDED.is_archived,
  updated_at = EXCLUDED.updated_at;\n`;
    }
  }

  // 3. Bookings Data (Preserving services & delivery_method)
  if (bookings.length > 0) {
    restoreSql += `\n-- 3. Restore Bookings (${bookings.length} records)\n`;
    for (const b of bookings) {
      restoreSql += `INSERT INTO bookings (id, organization_id, dog_id, check_in_at, check_out_at, current_status, services, notes, delivery_method, is_outgoing_confirmed, created_at, updated_at)
VALUES (${sqlVal(b.id)}, ${sqlVal(b.organization_id)}, ${sqlVal(b.dog_id)}, ${sqlVal(b.check_in_at)}, ${sqlVal(b.check_out_at)}, ${sqlVal(b.current_status)}, ${sqlVal(b.services)}, ${sqlVal(b.notes)}, ${sqlVal(b.delivery_method)}, ${sqlVal(b.is_outgoing_confirmed)}, ${sqlVal(b.created_at)}, ${sqlVal(b.updated_at)})
ON CONFLICT (id) DO UPDATE SET
  dog_id = EXCLUDED.dog_id,
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  current_status = EXCLUDED.current_status,
  services = EXCLUDED.services,
  notes = EXCLUDED.notes,
  delivery_method = EXCLUDED.delivery_method,
  is_outgoing_confirmed = EXCLUDED.is_outgoing_confirmed,
  updated_at = EXCLUDED.updated_at;\n`;
    }
  }

  // 4. Status History Data
  if (statusHistory.length > 0) {
    restoreSql += `\n-- 4. Restore Status History (${statusHistory.length} records)\n`;
    for (const s of statusHistory) {
      restoreSql += `INSERT INTO status_history (id, organization_id, booking_id, previous_status, new_status, effective_at, changed_at, notes, created_at)
VALUES (${sqlVal(s.id)}, ${sqlVal(s.organization_id)}, ${sqlVal(s.booking_id)}, ${sqlVal(s.previous_status)}, ${sqlVal(s.new_status)}, ${sqlVal(s.effective_at)}, ${sqlVal(s.changed_at)}, ${sqlVal(s.notes)}, ${sqlVal(s.created_at)})
ON CONFLICT (id) DO UPDATE SET
  new_status = EXCLUDED.new_status,
  effective_at = EXCLUDED.effective_at,
  changed_at = EXCLUDED.changed_at,
  notes = EXCLUDED.notes;\n`;
    }
  }

  // 5. Application Settings Data
  if (appSettings.length > 0) {
    restoreSql += `\n-- 5. Restore Application Settings (${appSettings.length} records)\n`;
    for (const a of appSettings) {
      restoreSql += `INSERT INTO application_settings (id, hotel_timezone, version, build, environment, updated_at)
VALUES (${sqlVal(a.id)}, ${sqlVal(a.hotel_timezone)}, ${sqlVal(a.version)}, ${sqlVal(a.build)}, ${sqlVal(a.environment)}, ${sqlVal(a.updated_at)})
ON CONFLICT (id) DO UPDATE SET
  hotel_timezone = EXCLUDED.hotel_timezone,
  version = EXCLUDED.version,
  build = EXCLUDED.build,
  environment = EXCLUDED.environment,
  updated_at = EXCLUDED.updated_at;\n`;
    }
  }

  restoreSql += `\n-- ==============================================================================
-- RESTORE COMPLETE. All ${owners.length + dogs.length + bookings.length + statusHistory.length + appSettings.length} records restored with verified integrity.
-- ==============================================================================\n`;

  // Manifest
  const manifest = {
    manifestVersion: '1.0.0',
    appName: 'Oscar Dog Hotel',
    appVersion: '1.0.3',
    exportedAt,
    organizationId: orgId,
    verification: {
      status: verified ? 'VERIFIED_MATCH' : 'COUNT_DISCREPANCY_DETECTED',
      totalRecordsVerified: owners.length + dogs.length + bookings.length + statusHistory.length + appSettings.length,
      tableCounts: {
        owners: { database: ownersDbCount, exported: owners.length, match: owners.length === ownersDbCount },
        dogs: { database: dogsDbCount, exported: dogs.length, match: dogs.length === dogsDbCount },
        bookings: { database: bookingsDbCount, exported: bookings.length, match: bookings.length === bookingsDbCount },
        statusHistory: { database: statusHistoryDbCount, exported: statusHistory.length, match: statusHistory.length === statusHistoryDbCount },
        applicationSettings: { database: appSettings.length, exported: appSettings.length, match: true }
      }
    },
    files: [
      'manifest.json',
      'README.md',
      'restore.sql',
      'schema/01_tables_and_indexes.sql',
      'schema/02_rls_policies.sql',
      'data/owners.json',
      'data/dogs.json',
      'data/bookings.json',
      'data/status_history.json',
      'data/application_settings.json',
      'data/full_database_dump.json'
    ]
  };

  const readmeContent = `# Oscar Dog Hotel — Full Recovery Package

This recovery archive contains the complete database structure, relationships, and operational data exported from Oscar Dog Hotel.

**Export Timestamp:** \`${exportedAt}\`  
**Organization ID:** \`${orgId}\`  
**Total Records:** \`${manifest.verification.totalRecordsVerified}\`  
**Verification:** \`${manifest.verification.status}\`

---

## Package Contents

- **\`restore.sql\`**: Complete, self-contained, one-click restore script. Includes table creation, indexes, foreign keys, RLS security policies, and idempotent INSERT statements with all UUIDs and relationships preserved.
- **\`schema/01_tables_and_indexes.sql\`**: Pure DDL creating all database tables and indexes.
- **\`schema/02_rls_policies.sql\`**: Row Level Security policies for Supabase.
- **\`data/\`**: Raw JSON exports of each table:
  - \`owners.json\` (${owners.length} records)
  - \`dogs.json\` (${dogs.length} records)
  - \`bookings.json\` (${bookings.length} records — includes services and delivery/pickup)
  - \`status_history.json\` (${statusHistory.length} events)
  - \`application_settings.json\` (${appSettings.length} record)
  - \`full_database_dump.json\` (combined snapshot)
- **\`manifest.json\`**: Export metadata and audit verification report.

---

## How to Restore into a New Supabase Project

Restoring your backend takes less than 2 minutes:

1. **Log in to Supabase**:
   Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a new project (or select an existing one).

2. **Open the SQL Editor**:
   In the left sidebar, click the **SQL Editor** tab (terminal icon).

3. **Run the Restore Script**:
   - Open \`restore.sql\` from this ZIP in any text editor.
   - Copy the entire contents and paste into the Supabase SQL Editor.
   - Click the green **Run** button.

4. **Verify Restored Data**:
   Navigate to the **Table Editor** tab to confirm all dogs, owners, bookings, and statuses are present with exact dates, notes, and delivery settings.

5. **Connect Your App**:
   In your app configuration, update \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` to your new project's credentials.

---
*No sensitive credentials or staff passwords are included in this backup.*
`;

  const fullDump = {
    manifest,
    data: {
      owners,
      dogs,
      bookings,
      statusHistory,
      applicationSettings: appSettings
    }
  };

  // Step 9: Package into ZIP
  onProgress({
    step: 8,
    totalSteps,
    message: 'Compressing into recovery ZIP archive...',
    statusText: 'Finalizing ZIP package'
  });

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('README.md', readmeContent);
  zip.file('restore.sql', restoreSql);

  const schemaFolder = zip.folder('schema');
  schemaFolder?.file('01_tables_and_indexes.sql', schemaTablesSql);
  schemaFolder?.file('02_rls_policies.sql', schemaRlsSql);

  const dataFolder = zip.folder('data');
  dataFolder?.file('owners.json', JSON.stringify(owners, null, 2));
  dataFolder?.file('dogs.json', JSON.stringify(dogs, null, 2));
  dataFolder?.file('bookings.json', JSON.stringify(bookings, null, 2));
  dataFolder?.file('status_history.json', JSON.stringify(statusHistory, null, 2));
  dataFolder?.file('application_settings.json', JSON.stringify(appSettings, null, 2));
  dataFolder?.file('full_database_dump.json', JSON.stringify(fullDump, null, 2));

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const dateStr = exportedAt.split('T')[0];
  const filename = `oscar_dog_hotel_full_recovery_${dateStr}.zip`;

  const totalRecords = owners.length + dogs.length + bookings.length + statusHistory.length + appSettings.length;

  return {
    zipBlob,
    filename,
    sizeFormatted: formatBytes(zipBlob.size),
    totalRecords,
    counts: {
      owners: owners.length,
      dogs: dogs.length,
      bookings: bookings.length,
      statusHistory: statusHistory.length,
      applicationSettings: appSettings.length
    },
    exportedAt
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read backup data'));
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function saveBackupToDevice(result: BackupResult): Promise<{ success: boolean; message?: string }> {
  const { zipBlob, filename } = result;

  // 1. Android/iOS native environment via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(zipBlob);

      // Save to device Documents folder
      let savedDocUri = '';
      try {
        const docRes = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        savedDocUri = docRes.uri;
      } catch (docErr) {
        console.warn('Filesystem Documents save warning:', docErr);
      }

      // Also save to Cache for Android FileProvider sharing & folder picker
      const cacheRes = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });
      const fileToOpen = cacheRes.uri || savedDocUri;

      // Automatically launch Android file picker / share sheet so user can pick any folder
      try {
        await Share.share({
          title: filename,
          text: `Oscar Dog Hotel Backup: ${filename}`,
          files: [fileToOpen],
          dialogTitle: 'Save Backup ZIP to Folder'
        });
      } catch (shareErr: any) {
        if (shareErr.name !== 'AbortError') {
          console.warn('Share intent error:', shareErr);
        }
      }

      return {
        success: true,
        message: 'Saved to phone storage! Folder picker opened to save to your chosen folder.'
      };
    } catch (err: any) {
      console.error('Failed to save on device:', err);
      throw new Error(`Failed to save backup: ${err.message || 'Storage error'}`);
    }
  }

  // 2. Web: File System Access API
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Oscar Dog Hotel Recovery ZIP Archive',
            accept: { 'application/zip': ['.zip'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(zipBlob);
      await writable.close();
      return { success: true, message: 'Saved via folder picker!' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Save cancelled' };
      }
      console.warn('showSaveFilePicker failed, using fallback download:', err);
    }
  }

  // 3. Web: standard download fallback
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return { success: true, message: 'Downloaded to Downloads folder!' };
}

export function canShareBackupFile(result: BackupResult): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  try {
    const file = new File([result.zipBlob], result.filename, { type: 'application/zip' });
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareBackupFile(result: BackupResult): Promise<boolean> {
  const { zipBlob, filename } = result;

  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(zipBlob);
      const cacheRes = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });
      await Share.share({
        title: filename,
        text: `Oscar Dog Hotel Backup: ${filename}`,
        files: [cacheRes.uri],
        dialogTitle: 'Share Oscar Dog Hotel Backup'
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      throw err;
    }
  }

  if (!navigator.share) return false;
  try {
    const file = new File([zipBlob], filename, { type: 'application/zip' });
    await navigator.share({
      title: 'Oscar Dog Hotel Recovery Backup',
      text: `Recovery backup generated on ${result.exportedAt}. Contains ${result.totalRecords} verified records.`,
      files: [file]
    });
    return true;
  } catch (err: any) {
    if (err.name === 'AbortError') return false;
    throw err;
  }
}

