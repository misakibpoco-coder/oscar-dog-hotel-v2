import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const LEGACY_PROJECT_REF = 'steadtxkidcyqebxtmvf';

/** Required in production; a clearly-marked local-only default otherwise. */
function secret(name: string, devDefault: string): string {
  const v = process.env[name];
  if (v) return v;
  if (isProd) throw new Error(`[config] Missing required environment variable ${name}`);
  return devDefault;
}

const databaseUrl = secret('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5434/oscar_dog_hotel_v2');
if (databaseUrl.includes(LEGACY_PROJECT_REF)) {
  throw new Error('[config] DATABASE_URL points at the legacy V1 Supabase project. Refusing to start.');
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  hotelTimezone: process.env.HOTEL_TIMEZONE || 'Europe/Nicosia',
  databaseUrl,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwt: {
    secret: secret('JWT_SECRET', 'local-dev-only-jwt-secret'),
    refreshSecret: secret('JWT_REFRESH_SECRET', 'local-dev-only-jwt-refresh-secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  backup: {
    clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
    privateKey: (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10),
    encryptionKey: secret('BACKUP_ENCRYPTION_KEY', 'local-dev-only-backup-key-32-bytes!!')
  }
};
