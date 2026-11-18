# Liha Tex — Tirupur knitwear

Marketing site + API for **Liha Tex**, a knitwear unit and store in Tirupur, Tamil Nadu
selling banians, drawers, baby innerwear, kids vests and cotton fabrics.

- **Frontend** — static, no build step (`frontend/`), deployed on **Vercel**
- **Backend** — Express API (`backend/`), deployed on **Render**
- **Database** — PostgreSQL on **Neon** free tier (or Render Postgres)
- **Primary goal** — drive buyers to the offline store; the online store is "coming soon"
  and collects a launch waitlist

```
liha-tex/
├─ frontend/
│  ├─ index.html        # the whole site: markup, CSS, Three.js hero
│  ├─ js/liha-api.js    # waitlist, enquiry form, live store hours
│  ├─ assets/           # product photography
│  └─ vercel.json       # proxies /api/* to the Render service
├─ backend/
│  ├─ src/index.js      # Express app
│  ├─ src/db.js         # pg pool
│  ├─ src/schema.sql    # tables + catalogue seed (auto-runs)
│  ├─ src/routes/       # products, waitlist, enquiries
│  └─ README.md         # API docs + local dev
├─ render.yaml          # one-click Render blueprint
└─ README.md
```

## Run it locally

```bash
# 1. API
cd backend
cp .env.example .env      # add a DATABASE_URL (Neon)
npm install
npm run dev               # http://localhost:8080

# 2. Site (any static server, or just open the file)
cd frontend
npx serve .               # http://localhost:3000
```

`js/liha-api.js` automatically calls `http://localhost:8080/api` on localhost and
`/api` in production.

## Deploy

### 1. Database — Neon (free)

1. Create a project at [neon.tech](https://neon.tech) → copy the connection string.
2. Nothing else to do: `backend/src/schema.sql` creates the tables and seeds the
   catalogue on first boot.

> Render's free Postgres also works — `render.yaml` provisions one automatically.

### 2. Backend — Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. `render.yaml` creates the
   `liha-tex-api` service (root dir `backend`, health check `/api/health`).
3. If you use Neon instead of the bundled database, delete the `databases:` block
   and set `DATABASE_URL` on the service.
4. Keep the service name **`liha-tex-api`** — the Vercel rewrite points at
   `https://liha-tex-api.onrender.com`. If you rename it, update
   `frontend/vercel.json`.
5. Verify: `https://liha-tex-api.onrender.com/api/health` → `{"ok":true,"db":"up"}`.

### 3. Frontend — Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory:** `frontend`
3. Framework preset: **Other** (no build command, no output directory)
4. Deploy. `vercel.json` proxies `/api/*` to Render, so there are no CORS issues.

Add the final Vercel domain to `CORS_ORIGINS` on Render if you use a custom domain
(`*.vercel.app` previews are already allowed).

## API

| Method | Path | Body / query |
| ------ | ---- | ------------ |
| GET | `/api/health` | – |
| GET | `/api/products` | `?category=men\|baby\|kids\|fabric` |
| GET | `/api/products/:slug` | – |
| GET | `/api/store` | – (returns `openNow` in IST) |
| POST | `/api/waitlist` | `{ "contact": "email or 10-digit mobile" }` |
| GET | `/api/waitlist/count` | – |
| POST | `/api/enquiries` | `{ "name", "phone", "message?", "productInterest?", "quantity?" }` |

Writes are rate limited to 25 requests per 15 minutes per IP, validated with Zod
and stored with parameterised SQL.

## Replacing product photos

Drop real photos into `frontend/assets/` with these exact names (JPEG, roughly
4:5 portrait for cards, ≥1200 px wide):

| File | Used for |
| ---- | -------- |
| `banians.jpg` | Hero card + Men's Banians |
| `drawers.jpg` | Drawers & Trunks |
| `baby.jpg` | Baby Innerwear |
| `cotton.jpg` | Cotton fabrics / wholesale + hero inset |
| `kids.jpg` | Optional — kids range |

If a file is missing, the card falls back to an existing photo, so the layout
never breaks.

## Contact

Liha Tex — Tirupur, Tamil Nadu, India
95244 63580 · 99766 83036
