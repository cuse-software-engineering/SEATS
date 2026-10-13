import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

// โหลดไฟล์ .env จาก Root Directory
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const { Pool } = pg;

const connectionString = process.env.BOOKING_POSTGRES_URL;

export const pool = new Pool({
  connectionString,
});

export async function connectPostgres() {
  if (!connectionString) {
    console.log('[booking] no BOOKING_POSTGRES_URL: using in-memory store');
    return false;
  }
  try {
    const client = await pool.connect();
    console.log('[booking] the booking DB is on PostgreSQL');
    client.release();
    return true;
  } catch (err) {
    console.error('[booking] failed to connect to PostgreSQL:', err);
    return false;
  }
}