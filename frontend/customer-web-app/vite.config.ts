import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { apiProxyTarget, webAppPort } from '@seats/config/src/index.js';

// Customer Web App (the port from @seats/config); /api and /health go to the API Gateway (the only REST API, ADR-12).
// __BUILD__ is the commit the bundle was built from: Vercel sets VERCEL_GIT_COMMIT_SHA at build time; 'dev' locally.
const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'dev').slice(0, 7);
// In a GitHub Codespace the browser reaches the dev server through the forwarded name <codespace>-<port>.app.github.dev,
// which Vite's host check refuses unless allowed; VS Code desktop forwards to localhost, which Vite allows anyway.
const forwarding = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify({ sha, at: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' }) },
  server: {
    port: webAppPort('customer'),
    strictPort: true,
    allowedHosts: forwarding ? [`.${forwarding}`] : undefined,
    proxy: { '/api': apiProxyTarget(), '/health': apiProxyTarget() },   // the API Gateway (the only REST API, ADR-12)
  },
});
