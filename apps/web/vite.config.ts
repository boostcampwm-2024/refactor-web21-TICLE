import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig(() => {
  const isAnalyze = process.env.ANALYZE === 'true';

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      svgr(),
      TanStackRouterVite({ routeToken: '_layout' }),
      isAnalyze &&
        visualizer({
          filename: './dist/report.html',
          open: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            'mediasoup-client': ['mediasoup-client'],
            'framer-motion': ['framer-motion'],
            tanstack: ['@tanstack/react-query', '@tanstack/react-router'],
            'date-fns': ['date-fns'],
          },
        },
      },
    },
  };
});
