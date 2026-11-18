import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';

export const waitlist = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE = /^\+?\d{10,15}$/;

/** Accepts either an email address or an Indian mobile number. */
function normalise(contact) {
  const value = String(contact ?? '').trim();
  if (EMAIL.test(value)) return { contact: value.toLowerCase(), contactType: 'email' };

  const digits = value.replace(/[^\d+]/g, '').replace(/^\+?91(?=\d{10}$)/, '');
  if (PHONE.test(digits) && digits.replace(/\D/g, '').length >= 10) {
    return { contact: `+91${digits.replace(/\D/g, '').slice(-10)}`, contactType: 'phone' };
  }
  return null;
}

const bodySchema = z.object({
  contact: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  source: z.string().trim().max(80).optional(),
  consent: z.coerce.boolean().default(true),
});

waitlist.post('/', async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body ?? {});
    const parsed = normalise(body.contact || body.email || body.phone);

    if (!parsed) {
      return res.status(400).json({
        ok: false,
        error: 'Enter a valid email address or 10-digit mobile number.',
      });
    }

    const { rows } = await query(
      `INSERT INTO waitlist (contact, contact_type, source, consent)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (contact) DO NOTHING
       RETURNING id, created_at`,
      [parsed.contact, parsed.contactType, body.source ?? 'website', body.consent],
    );

    if (!rows[0]) {
      return res.status(200).json({
        ok: true,
        alreadyRegistered: true,
        message: "You're already on the list — we'll message you the moment the store opens.",
      });
    }

    res.status(201).json({
      ok: true,
      alreadyRegistered: false,
      message: "You're on the list. We'll send one message when the online store opens.",
    });
  } catch (err) {
    next(err);
  }
});

waitlist.get('/count', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT COUNT(*)::int AS count FROM waitlist');
    res.set('Cache-Control', 'public, max-age=120');
    res.json({ ok: true, count: rows[0].count });
  } catch (err) {
    next(err);
  }
});
