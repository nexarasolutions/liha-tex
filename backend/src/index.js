import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { migrate, query } from './db.js';
import { products } from './routes/products.js';
import { waitlist } from './routes/waitlist.js';
import { enquiries } from './routes/enquiries.js';
import { store, storeStatus } from './store.js';

const PORT = Number(process.env.PORT || 8080);
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '16kb' }));

/**
 * Allowed browser origins: local dev, the Vercel production URL and any
 * preview deployment. Extra origins can be added with CORS_ORIGINS.
 */
const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'https://liha-tex.vercel.app',
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl, server-to-server, Vercel proxy
      if (extraOrigins.includes(origin) || defaultOrigins.includes(origin)) return cb(null, true);
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
      return cb(new Error(`Origin not allowed: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  }),
);

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests — please try again in a few minutes.' },
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'Liha Tex API',
    docs: {
      health: 'GET /api/health',
      products: 'GET /api/products?category=men|baby|kids|fabric',
      store: 'GET /api/store',
      waitlist: 'POST /api/waitlist { contact }',
      enquiry: 'POST /api/enquiries { name, phone, message }',
    },
  });
});

app.get('/api/health', async (_req, res) => {
  const started = Date.now();
  try {
    await query('SELECT 1');
    res.json({
      ok: true,
      db: 'up',
      latencyMs: Date.now() - started,
      uptimeSec: Math.round(process.uptime()),
    });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', error: err.message });
  }
});

app.get('/api/store', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ ok: true, store, status: storeStatus() });
});

app.use('/api/products', products);
app.use('/api/waitlist', writeLimiter, waitlist);
app.use('/api/enquiries', writeLimiter, enquiries);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      ok: false,
      error: 'Please check the details you entered.',
      fields: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (/not allowed/i.test(err?.message ?? '') || /ECONNREFUSED|ENOTFOUND|terminating connection/i.test(err?.message ?? '')) {
    console.error('[api]', err.message);
    return res.status(503).json({ ok: false, error: 'Service temporarily unavailable.' });
  }

  console.error('[api] unhandled:', err);
  res.status(500).json({ ok: false, error: 'Something went wrong. Please call us on 95244 63580.' });
});

/** Neon free tiers sleep; retry the migration a few times before giving up. */
async function warmDatabase(attempts = 6) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await migrate();
      return true;
    } catch (err) {
      console.error(`[db] migration attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  return false;
}

const ready = warmDatabase();

app.listen(PORT, () => {
  console.log(`[api] Liha Tex API listening on :${PORT}`);
});

ready.then((ok) =>
  console.log(ok ? '[api] database connected' : '[api] starting without database — check DATABASE_URL'),
);
