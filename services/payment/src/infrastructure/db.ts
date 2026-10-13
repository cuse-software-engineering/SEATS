import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const { Pool } = pg;

const connectionString = process.env.PAYMENT_POSTGRES_URL;

// ต้องมีคำว่า export หน้า const pool
export const pool = new Pool({
  connectionString,
});

export async function connectPostgres() {
  if (!connectionString) {
    console.log('[payment] no PAYMENT_POSTGRES_URL: using in-memory store');
    return false;
  }
  try {
    const client = await pool.connect();
    console.log('[payment] the payment DB is on PostgreSQL');
    client.release();
    return true;
  } catch (err) {
    console.error('[payment] failed to connect to PostgreSQL:', err);
    return false;
  }
}