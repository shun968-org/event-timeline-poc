import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // devContainer の外には公開せず、VS Code のポート転送で開く
  server: { host: '127.0.0.1' },
});
