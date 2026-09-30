import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Back-office Web App on :5174; /api and /health go to the API Gateway (the only REST API, ADR-12).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': 'http://localhost:4000', '/health': 'http://localhost:4000' },
  },
});
