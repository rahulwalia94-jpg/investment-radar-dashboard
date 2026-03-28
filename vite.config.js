import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/investment-radar-dashboard/',
  server: { port: 5173 },
  build:  { outDir: 'dist' },
});
