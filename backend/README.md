# Liha Tex — Backend (Render)

Small Express + PostgreSQL API for the Liha Tex storefront: catalogue, launch
waitlist and wholesale enquiries.

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/health` | Liveness + database check |
| GET | `/api/products?category=men` | Catalogue (`men`, `baby`, `kids`, `fabric`) |
| GET | `/api/products/:slug` | Single product |
| GET | `/api/store` | Store details + `openNow` (IST) |
| POST | `/api/waitlist` | `{ contact }` email or 10-digit mobile |
| GET | `/api/waitlist/count` | Signup count for social proof |
| POST | `/api/enquiries` | `{ name, phone, message?, productInterest?, quantity? }` |

The schema and catalogue seed live in `src/schema.sql` and run automatically on
boot, so the first deploy creates every table.

## Environment variables

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `DATABASE_URL` | yes | Neon/Supabase/Render Postgres connection string |
| `CORS_ORIGINS` | no | Comma-separated extra origins (Vercel previews allowed automatically) |
| `PG_POOL_MAX` | no | Defaults to 5 |

## Local development

```bash
cd backend
cp .env.example .env     # then paste your DATABASE_URL
npm install
npm run dev              # http://localhost:8080
```

```bash
curl http://localhost:8080/api/health
curl "http://localhost:8080/api/products?category=men"
curl -X POST http://localhost:8080/api/waitlist \
  -H "Content-Type: application/json" -d '{"contact":"9876543210"}'
```

## Deploy on Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint**, pick the repo (uses `render.yaml`), or create a
   **Web Service** manually with root directory `backend`.
3. Build command: `npm ci` — Start command: `npm start`.
4. Add `DATABASE_URL` from Neon (free tier) and deploy.
