// What the plain-Node scripts share (they cannot import the TypeScript registry of packages/config, so they carry its
// defaults): the gateway's URL from GATEWAY, the wait for /health (a sleeping Render instance takes up to a minute to
// wake) and a fetch helper with the fake-auth headers of progress 1.
export const GATEWAY = (process.env.GATEWAY ?? 'http://localhost:4000').replace(/\/$/, '');
export const WAIT_MS = Number(process.env.GATEWAY_WAIT_MS ?? 90_000);

/** The headers of one identity: a customer (a LINE user id) or a staff role. */
export const H = (userId, role) => ({ 'x-user-id': userId, 'x-role': role, 'content-type': 'application/json' });

/** One look at /health: up when the gateway and every service report ok. */
export async function health(gateway = GATEWAY) {
  try {
    const r = await fetch(`${gateway}/health`, { signal: AbortSignal.timeout(10_000) });
    const body = await r.json();
    const down = (body.services ?? []).filter((s) => !s.ok).map((s) => s.service);
    return { up: r.ok && body.ok === true && down.length === 0, detail: down.length ? `services down: ${down.join(', ')}` : `HTTP ${r.status}` };
  } catch (e) {
    return { up: false, detail: e.cause?.code ?? e.name ?? String(e) };
  }
}

/** Waits until the gateway is healthy and answers the seconds it took; exits with 2 and a hint when WAIT_MS pass. */
export async function waitForGateway(gateway = GATEWAY) {
  const started = Date.now();
  for (;;) {
    const last = await health(gateway);
    if (last.up) return Math.round((Date.now() - started) / 1000);
    if (Date.now() - started > WAIT_MS) {
      console.error(`no healthy gateway at ${gateway} after ${Math.round(WAIT_MS / 1000)} s (${last.detail}); start one with npm run dev, npm run dev:mono or docker compose up, or set GATEWAY`);
      process.exit(2);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/** One call through the gateway; the JSON answer, or an Error naming the call when the status is not `expect`. */
export async function call(headers, method, path, body, { gateway = GATEWAY, expect = 200 } = {}) {
  const r = await fetch(gateway + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await r.json().catch(() => null);
  if (r.status !== expect) throw new Error(`${method} ${path} -> ${r.status} (expected ${expect}) ${JSON.stringify(json)}`);
  return json;
}
