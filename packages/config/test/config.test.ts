// The addresses come from the environment when it is set and from the registry when it is not.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { apiProxyTarget, DEFAULTS, gatewayPort, gatewayUrl, grpcAddress, grpcDeadlineMs, grpcPort, SERVICES, webAppPort } from '../src/index.js';

const VARS = ['PORT', 'GATEWAY', 'GRPC_PORT', 'GRPC_DEADLINE_MS', 'API_PROXY', ...Object.values(SERVICES).map((s) => s.addressEnv)];
const saved = Object.fromEntries(VARS.map((v) => [v, process.env[v]]));
afterEach(() => { for (const v of VARS) { if (saved[v] === undefined) delete process.env[v]; else process.env[v] = saved[v]; } });
const clear = () => { for (const v of VARS) delete process.env[v]; };

test('the defaults: every service has its own port, the gateway 4000, the apps 5173 and 5174', () => {
  clear();
  assert.deepEqual(Object.values(SERVICES).map((s) => s.grpcPort), [5001, 5002, 5003, 5004, 5005, 5006]);
  assert.equal(new Set(Object.values(SERVICES).map((s) => s.grpcPort)).size, 6);
  assert.equal(grpcPort('booking'), 5002); assert.equal(grpcAddress('booking'), 'localhost:5002');
  assert.equal(gatewayPort(), 4000); assert.equal(gatewayUrl(), 'http://localhost:4000'); assert.equal(apiProxyTarget(), 'http://localhost:4000');
  assert.equal(webAppPort('customer'), 5173); assert.equal(webAppPort('back-office'), 5174); assert.equal(grpcDeadlineMs(), DEFAULTS.grpcDeadlineMs);
});

test('the environment overrides: a container name for a client, PORT for a listener, GATEWAY for a caller (trailing slash dropped)', () => {
  clear();
  process.env.BOOKING_GRPC = 'booking:5002'; process.env.GRPC_PORT = '6002'; process.env.PORT = '8080'; process.env.GATEWAY = 'https://seats-monolith.onrender.com/'; process.env.API_PROXY = 'http://backend:4000'; process.env.GRPC_DEADLINE_MS = '500';
  assert.equal(grpcAddress('booking'), 'booking:5002'); assert.equal(grpcAddress('payment'), 'localhost:5004');
  assert.equal(grpcPort('booking'), 6002); assert.equal(gatewayPort(), 8080); assert.equal(webAppPort('customer'), 8080);
  assert.equal(gatewayUrl(), 'https://seats-monolith.onrender.com'); assert.equal(apiProxyTarget(), 'http://backend:4000'); assert.equal(grpcDeadlineMs(), 500);
});

test('a blank variable counts as unset; a non-numeric port fails fast', () => {
  clear();
  process.env.PORT = '  '; assert.equal(gatewayPort(), 4000);
  process.env.PORT = 'eighty'; assert.throws(() => gatewayPort(), /PORT=eighty is not a port/);
  process.env.GRPC_PORT = '-1'; assert.throws(() => grpcPort('booking'), /GRPC_PORT=-1/);
});
