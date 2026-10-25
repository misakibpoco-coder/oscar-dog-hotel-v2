import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// V2 safety guard: never run against the legacy V1 Supabase project.
if ((process.env.DATABASE_URL || '').includes('steadtxkidcyqebxtmvf')) {
  console.error('Refusing to run: DATABASE_URL points at the legacy V1 Supabase project.');
  process.exit(1);
}


const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/oscar_dog_hotel';

async function runMigrations() {
  console.log('Connecting to database for migrations...');
  console.log(`Target: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

  const isCloudDb = databaseUrl.includes('render.com') || databaseUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production';
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: isCloudDb ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const res = await client.query('SELECT name FROM _schema_migrations');
    const applied = new Set(res.rows.map((r: { name: string }) => r.name));

    // 3. Find migration files
    const migrationsDir = path.join(__dirname);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[SKIP] Migration ${file} already applied.`);
        continue;
      }

      console.log(`[APPLYING] Migration ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[SUCCESS] Migration ${file} applied successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[ERROR] Migration ${file} failed:`, err);
        throw err;
      }
    }

    console.log('All migrations completed successfully.');
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations().catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}

export { runMigrations };
