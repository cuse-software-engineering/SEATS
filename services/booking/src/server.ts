// The composition root of the Booking Service as a process: the store, the ports bound to the infrastructure, the gRPC
// transport and the hold-expiry job. The monolith composes the same pieces in its own process (ADR-14).
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { grpcPort } from '@seats/config/src/index.js';
import { connectPostgres } from './infrastructure/db.js';
import { wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';
import { expireUnpaidBookings } from './domain/index.js';

const EXPIRY_JOB_MS = Number(process.env.EXPIRY_JOB_MS ?? 5000);   // ADR-08: every 5 s, so a hold is released within 10 s of its end

// เชื่อมต่อ PostgreSQL (seats_booking) บน Docker
await connectPostgres();

wire();                                              // the repositories and the gRPC clients behind the domain's ports
startGrpc(grpcPort('booking'));                      // the only transport (ADR-12): the API Gateway calls it by gRPC

// Background Job คอยเช็คและยกเลิกการจองที่หมดเวลาชำระเงิน
setInterval(() => { 
  expireUnpaidBookings().catch((e: Error) => console.error('[booking] expiry job failed:', e.message)); 
}, EXPIRY_JOB_MS).unref();