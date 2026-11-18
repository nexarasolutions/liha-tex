-- Liha Tex — database schema (PostgreSQL / Neon free tier)
-- Runs automatically on boot; safe to run repeatedly.

CREATE TABLE IF NOT EXISTS products (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  tagline      TEXT,
  description  TEXT,
  fabric       TEXT,
  sizes        TEXT[] NOT NULL DEFAULT '{}',
  pack         TEXT,
  image        TEXT,
  in_store     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waitlist (
  id           BIGSERIAL PRIMARY KEY,
  contact      TEXT NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'phone')),
  source       TEXT,
  consent      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact)
);

CREATE TABLE IF NOT EXISTS enquiries (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  product_interest TEXT,
  quantity         TEXT,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enquiries_created_idx ON enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS waitlist_created_idx ON waitlist (created_at DESC);

-- Seed the catalogue once. Images live in the frontend under /assets.
INSERT INTO products (slug, name, category, tagline, description, fabric, sizes, pack, image, sort_order) VALUES
  ('mens-banians', 'Men''s Banians', 'men', 'Men · Everyday',
   'Combed-cotton vests with a soft ribbed finish, gentle neckline and a shape that lasts wash after wash.',
   'Combed cotton', ARRAY['S','M','L','XL','XXL'], 'Pack of 3 / 5', '/assets/banians.jpg', 1),
  ('drawers-trunks', 'Drawers & Trunks', 'men', 'Men · Comfort',
   'Breathable knit, reinforced waistbands and flat seams — built for all-day comfort and daily wear.',
   'Cotton knit · Stretch', ARRAY['S','M','L','XL','XXL'], 'Pack of 2 / 3', '/assets/drawers.jpg', 2),
  ('baby-innerwear', 'Baby Innerwear', 'baby', 'Baby · Gentle',
   'Feather-soft cotton vests and nappies with no harsh seams, dyed with skin-friendly colours.',
   'Skin-soft cotton', ARRAY['0–3M','3–6M','6–12M','1–2Y'], 'Pack of 3', '/assets/baby.jpg', 3),
  ('kids-vests', 'Kids Vests', 'kids', 'Kids · Daily',
   'Breathable vests and briefs for growing bodies, cut for easy movement and long school days.',
   'Combed cotton', ARRAY['2–3Y','4–5Y','6–7Y','8–9Y'], 'Pack of 3', '/assets/kids.jpg', 4),
  ('cotton-fabrics', 'Cotton Fabrics', 'fabric', 'Fabric · Wholesale',
   'Single-jersey, rib and interlock knits in greige or dyed to order. Bulk lots for garment makers.',
   'Single jersey · Rib · Interlock', ARRAY['Bulk'], 'By kg / roll', '/assets/cotton.jpg', 5)
ON CONFLICT (slug) DO NOTHING;
