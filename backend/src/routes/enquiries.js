import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';

export const enquiries = Router();

const bodySchema = z.object({
  name: z.string().trim().min(2, 'Please share your name.').max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d]/g, '').slice(-10))
    .refine((v) => v.length === 10, 'Enter a 10-digit mobile number.'),
  email: z.string().trim().email('Enter a valid email.').max(120).optional().or(z.literal('')),
  productInterest: z.string().trim().max(80).optional(),
  quantity: z.string().trim().max(60).optional(),
  message: z.string().trim().max(1200).optional(),
});

enquiries.post('/', async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body ?? {});

    const { rows } = await query(
      `INSERT INTO enquiries (name, phone, email, product_interest, quantity, message)
       VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6)
       RETURNING id, created_at`,
      [
        body.name,
        body.phone,
        body.email ?? '',
        body.productInterest ?? null,
        body.quantity ?? null,
        body.message ?? null,
      ],
    );

    res.status(201).json({
      ok: true,
      id: rows[0].id,
      message: 'Thank you — our team will call you back shortly.',
    });
  } catch (err) {
    next(err);
  }
});
