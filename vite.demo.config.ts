import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Ensures relative paths for assets
  build: {
    outDir: 'lp/demo',
    emptyOutDir: true,
  },
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEMO_MODE': '"true"',
    'import.meta.env.VITE_API_BASE': '"/api"' // Ignored by mock adapter but good for consistency
  }
});
