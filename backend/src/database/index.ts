import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

const isCloudDb = config.databaseUrl.includes('render.com') || config.databaseUrl.includes('sslmode=require') || config.nodeEnv === 'production';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    if (config.nodeEnv === 'development' && process.env.DEBUG_SQL === 'true') {
      const duration = Date.now() - start;
      console.log(`[SQL] executed in ${duration}ms | rows: ${res.rowCount}`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL ERROR] Query failed: ${text}`);
    throw err;
  }
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
