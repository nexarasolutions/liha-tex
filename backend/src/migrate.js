import { pool, migrate } from './db.js';

try {
  await migrate();
  const { rows } = await pool.query('SELECT COUNT(*)::int AS products FROM products');
  console.log(`[db] ${rows[0].products} products in catalogue`);
} catch (err) {
  console.error('[db] migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

void fileURLToPath;
