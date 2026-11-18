import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';

export const products = Router();

const listQuery = z.object({
  category: z.enum(['men', 'baby', 'kids', 'fabric']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

products.get('/', async (req, res, next) => {
  try {
    const { category, limit } = listQuery.parse(req.query);
    const { rows } = await query(
      `SELECT id, slug, name, category, tagline, description, fabric, sizes, pack, image, in_store
         FROM products
        WHERE ($1::text IS NULL OR category = $1)
        ORDER BY sort_order ASC, id ASC
        LIMIT $2`,
      [category ?? null, limit],
    );

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ ok: true, count: rows.length, products: rows });
  } catch (err) {
    next(err);
  }
});

products.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, slug, name, category, tagline, description, fabric, sizes, pack, image, in_store
         FROM products WHERE slug = $1`,
      [req.params.slug],
    );
    if (!rows[0]) return res.status(404).json({ ok: false, error: 'Product not found' });
    res.json({ ok: true, product: rows[0] });
  } catch (err) {
    next(err);
  }
});
