// Where the parts of SEATS run, in one place. A process never carries a port or an address of its own: it asks here,
// and here the answer is the environment variable when it is set and the development default when it is not.
//
//   process                       listens on                  found by others at
//   API Gateway (REST)            PORT            4000        GATEWAY             http://localhost:4000
//   Concert Round Service         GRPC_PORT       5001        CONCERT_ROUND_GRPC  localhost:5001
//   Booking Service               GRPC_PORT       5002        BOOKING_GRPC        localhost:5002
//   Table Availability Service    GRPC_PORT       5003        TABLE_AVAILABILITY_GRPC
//   Payment Service               GRPC_PORT       5004        PAYMENT_GRPC
//   Notification Service          GRPC_PORT       5005        NOTIFICATION_GRPC
//   Staff Account Service         GRPC_PORT       5006        STAFF_ACCOUNT_GRPC
//   Customer Web App (Vite)       PORT            5173        CUSTOMER_APP_URL    http://localhost:5173; proxies /api and /health to API_PROXY
//   Back-office Web App (Vite)    PORT            5174        BACK_OFFICE_APP_URL http://localhost:5174; proxies /api and /health to API_PROXY
//
// docker-compose.yml sets the *_GRPC variables to the container names; the monolith (ADR-14) needs none of the gRPC
// addresses; the deployment (Render, Vercel) sets PORT and the rewrites, and a test or a script reaches it through
// GATEWAY, CUSTOMER_APP_URL and BACK_OFFICE_APP_URL. The databases are configured by @seats/store (<SERVICE>_MONGO_URL,
// MONGO_URL). DEMO_RESET_TOKEN, when set, gives the monolith its demo reset route (monolith/src/admin.ts).

export type ServiceName = 'concert-round' | 'booking' | 'table-availability' | 'payment' | 'notification' | 'staff-account';

export interface ServiceEntry {
  /** The gRPC port the service listens on in development; GRPC_PORT overrides it in the service's own process. */
  readonly grpcPort: number;
  /** The variable that tells a caller where the service is (host:port); unset means localhost and the default port. */
  readonly addressEnv: string;
}

export const SERVICES: Readonly<Record<ServiceName, ServiceEntry>> = {
  'concert-round': { grpcPort: 5001, addressEnv: 'CONCERT_ROUND_GRPC' },
  booking: { grpcPort: 5002, addressEnv: 'BOOKING_GRPC' },
  'table-availability': { grpcPort: 5003, addressEnv: 'TABLE_AVAILABILITY_GRPC' },
  payment: { grpcPort: 5004, addressEnv: 'PAYMENT_GRPC' },
  notification: { grpcPort: 5005, addressEnv: 'NOTIFICATION_GRPC' },
  'staff-account': { grpcPort: 5006, addressEnv: 'STAFF_ACCOUNT_GRPC' },
};

export const DEFAULTS = {
  gatewayPort: 4000,
  customerAppPort: 5173,
  backOfficeAppPort: 5174,
  /** How long a gRPC call may take before the caller gives up (DEADLINE_EXCEEDED, answered 504 by the gateway). */
  grpcDeadlineMs: 2000,
} as const;

const env = (name: string): string | undefined => { const v = process.env[name]?.trim(); return v ? v : undefined; };
const int = (name: string, fallback: number): number => {
  const v = env(name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name}=${v} is not a port or a count`);   // fail fast at start-up
  return n;
};

/** The port this service listens on: GRPC_PORT, else its default. */
export const grpcPort = (service: ServiceName): number => int('GRPC_PORT', SERVICES[service].grpcPort);
/** Where a caller finds the service: <SERVICE>_GRPC (host:port, the container name under docker compose), else localhost and the default port. */
export const grpcAddress = (service: ServiceName): string => env(SERVICES[service].addressEnv) ?? `localhost:${SERVICES[service].grpcPort}`;
/** The deadline of one gRPC call: GRPC_DEADLINE_MS, else the default. */
export const grpcDeadlineMs = (): number => int('GRPC_DEADLINE_MS', DEFAULTS.grpcDeadlineMs);

/** The port the API Gateway (or the monolith) listens on: PORT, else the default. */
export const gatewayPort = (): number => int('PORT', DEFAULTS.gatewayPort);
/** The URL a client, a test or a script calls the gateway at: GATEWAY, else localhost and the gateway's port. */
export const gatewayUrl = (): string => (env('GATEWAY') ?? `http://localhost:${gatewayPort()}`).replace(/\/$/, '');

/** The Vite dev-server port of a web app: PORT, else its default. */
export const webAppPort = (app: 'customer' | 'back-office'): number => int('PORT', app === 'customer' ? DEFAULTS.customerAppPort : DEFAULTS.backOfficeAppPort);
/** Where a web app's dev server proxies /api and /health: API_PROXY, else the gateway's default URL. */
export const apiProxyTarget = (): string => env('API_PROXY') ?? `http://localhost:${DEFAULTS.gatewayPort}`;
/** Where a browser, or Playwright, finds a web app: CUSTOMER_APP_URL or BACK_OFFICE_APP_URL (a deployment), else the dev server on localhost. */
export const webAppUrl = (app: 'customer' | 'back-office'): string =>
  (env(app === 'customer' ? 'CUSTOMER_APP_URL' : 'BACK_OFFICE_APP_URL') ?? `http://localhost:${webAppPort(app)}`).replace(/\/$/, '');

/** The token that enables POST /api/admin/reset of the monolith, the demo reset; unset means there is no such route. */
export const demoResetToken = (): string | undefined => env('DEMO_RESET_TOKEN');
