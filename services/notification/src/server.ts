import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // ชี้ออกไปดึง .env จาก Root
import { grpcPort } from '@seats/config/src/index.js';
import { connectBroker, connectStore, wire } from './infrastructure/index.js';
import { startGrpc } from './api/grpc.js';
import { startConsumers } from './api/consumer.js';
import { retryFailedMessages } from './domain/index.js';

await connectStore();   // the Notification DB (ADR-06): MongoDB with NOTIFICATION_MONGO_URL or MONGO_URL, else in memory
await connectBroker();  // the message broker: RabbitMQ when RABBITMQ_URL is set, else in process
wire();                 // binds the repositories, the LINE adapter and the broker to the domain's ports

const RETRY_JOB_MS = Number(process.env.NOTIFICATION_RETRY_MS ?? 100_000);   // FR-22: three retries within five minutes

await startConsumers();                                   // the hold-expiry event of the Booking Service (UC-01 EF-1)
startGrpc(grpcPort('notification'));                      // the only transport (ADR-12): the Booking and Payment Services call it by gRPC
setInterval(() => { retryFailedMessages().catch((e: Error) => console.error('[notification] retry job failed:', e.message)); }, RETRY_JOB_MS).unref();
