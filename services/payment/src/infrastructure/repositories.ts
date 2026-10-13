// The repository of the Payment DB using PostgreSQL
import { pool } from './db.js';
import type { Payment } from '../domain/model.js';
import type { PaymentRepository } from '../domain/repository.js';

/** The repository in use (PostgreSQL Implementation). */
export const payments: PaymentRepository = {
  get: async (paymentId: string): Promise<Payment | null> => {
    if (!pool) return null;

    const res = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      paymentId: row.id,
      bookingId: row.booking_id,
      customerId: row.customer_id,
      amount: parseFloat(row.amount),
      status: row.status,
      checkoutUrl: row.checkout_url || '',
      createdAt: row.created_at || '',
      resultAt: row.result_at || '',
    };
  },

  save: async (p: Payment): Promise<void> => {
    if (!pool) return;

    const query = `
      INSERT INTO payments (id, booking_id, customer_id, amount, status, checkout_url, created_at, result_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        checkout_url = EXCLUDED.checkout_url,
        amount = EXCLUDED.amount,
        result_at = EXCLUDED.result_at;
    `;

    await pool.query(query, [
      p.paymentId,
      p.bookingId,
      p.customerId,
      p.amount,
      p.status,
      p.checkoutUrl,
      p.createdAt,
      p.resultAt,
    ]);
  },
};