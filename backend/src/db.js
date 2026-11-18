import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/liha_tex';

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Neon and Render Postgres both serve TLS with managed certificates.
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);

export async function migrate() {
  const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('[db] schema ready');
}
