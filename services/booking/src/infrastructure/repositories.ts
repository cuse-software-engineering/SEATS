import type { Booking, CustomerProfile } from '../domain/model.js';
import type { BookingRepository, CustomerProfileRepository, TableLock } from '../domain/repository.js';
import { pool } from './db.js';

export const bookings: BookingRepository = {
  get: async (id) => {
    const res = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      customerId: row.customer_id,
      roundId: row.round_id,
      tableNumber: Number(row.table_number),
      status: row.status as Booking['status'],
      holdEndsAt: row.hold_ends_at ? new Date(row.hold_ends_at).toISOString() : '',
      amount: Number(row.total_amount),
    } as unknown as Booking;
  },

  save: async (b) => {
    const query = `
      INSERT INTO bookings (id, customer_id, round_id, table_number, status, hold_ends_at, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        round_id = EXCLUDED.round_id,
        table_number = EXCLUDED.table_number,
        status = EXCLUDED.status,
        hold_ends_at = EXCLUDED.hold_ends_at,
        total_amount = EXCLUDED.total_amount;
    `;
    await pool.query(query, [
      b.id,
      b.customerId,
      b.roundId,
      b.tableNumber,
      b.status,
      b.holdEndsAt ? new Date(b.holdEndsAt) : null,
      (b as any).amount ?? (b as any).totalAmount ?? 0,
    ]);
    return b;
  },

  remove: async (id) => {
    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
  },

  ofCustomer: async (customerId) => {
    const res = await pool.query('SELECT * FROM bookings WHERE customer_id = $1', [customerId]);
    return res.rows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      roundId: row.round_id,
      tableNumber: Number(row.table_number),
      status: row.status as Booking['status'],
      holdEndsAt: row.hold_ends_at ? new Date(row.hold_ends_at).toISOString() : '',
      amount: Number(row.total_amount),
    })) as unknown as Booking[];
  },

  ofRound: async (roundId) => {
    const res = await pool.query('SELECT * FROM bookings WHERE round_id = $1', [roundId]);
    return res.rows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      roundId: row.round_id,
      tableNumber: Number(row.table_number),
      status: row.status as Booking['status'],
      holdEndsAt: row.hold_ends_at ? new Date(row.hold_ends_at).toISOString() : '',
      amount: Number(row.total_amount),
    })) as unknown as Booking[];
  },

  heldEndingBy: async (time) => {
    const res = await pool.query(
      "SELECT * FROM bookings WHERE status = 'Held' AND hold_ends_at <= $1",
      [new Date(time)]
    );
    return res.rows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      roundId: row.round_id,
      tableNumber: Number(row.table_number),
      status: row.status as Booking['status'],
      holdEndsAt: row.hold_ends_at ? new Date(row.hold_ends_at).toISOString() : '',
      amount: Number(row.total_amount),
    })) as unknown as Booking[];
  },
};

export const profiles: CustomerProfileRepository = {
  get: async (customerId) => {
    const res = await pool.query('SELECT * FROM profiles WHERE customer_id = $1', [customerId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      customerId: row.customer_id,
      displayName: row.display_name,
      lineUserId: row.line_user_id,
      ...row,
    } as unknown as CustomerProfile;
  },

  save: async (p) => {
    const query = `
      INSERT INTO profiles (customer_id, display_name, line_user_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (customer_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        line_user_id = EXCLUDED.line_user_id;
    `;
    const profileObj = p as any;
    await pool.query(query, [
      profileObj.customerId ?? profileObj.id,
      profileObj.displayName ?? profileObj.name ?? '',
      profileObj.lineUserId ?? profileObj.lineId ?? '',
    ]);
    return p;
  },
};

/** Atomic Table Lock โดยใช้ Primary Key Constraint ใน PostgreSQL (BRULE-03) */
export const tableLock: TableLock = {
  acquire: async (roundId, tableNumber, bookingId) => {
    const key = `${roundId}/${tableNumber}`;
    try {
      await pool.query('INSERT INTO holds (lock_key, booking_id) VALUES ($1, $2)', [key, bookingId]);
      return true;
    } catch (err: any) {
      if (err.code === '23505') { // Error Code 23505 = Unique/Primary Key Violation
        return false;
      }
      throw err;
    }
  },

  release: async (roundId, tableNumber, bookingId) => {
    const key = `${roundId}/${tableNumber}`;
    await pool.query('DELETE FROM holds WHERE lock_key = $1 AND booking_id = $2', [key, bookingId]);
  },
};