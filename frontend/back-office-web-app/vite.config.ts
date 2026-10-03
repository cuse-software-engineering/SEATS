import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { apiProxyTarget, webAppPort } from '@seats/config/src/index.js';

// Back-office Web App (the port from @seats/config); /api and /health go to the API Gateway (the only REST API, ADR-12).
// __BUILD__ is the commit the bundle was built from: Vercel sets VERCEL_GIT_COMMIT_SHA at build time; 'dev' locally.
const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'dev').slice(0, 7);

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify({ sha, at: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' }) },
  server: {
    port: webAppPort('back-office'),
    strictPort: true,
    proxy: { '/api': apiProxyTarget(), '/health': apiProxyTarget() },   // the API Gateway (the only REST API, ADR-12)
  },
});
