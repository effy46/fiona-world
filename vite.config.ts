import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.GITHUB_PAGES === 'true' ? '/fiona-world/' : '/';

export default defineConfig(({ isSsrBuild }) => ({
  base,
  plugins: [react()],
  ssgOptions: {
    includedRoutes: () => ['/', '/projects', '/skills', '/thoughts', '/contact', '/standard'],
  },
  ssr: {
    noExternal: ['react-helmet-async'],
  },
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: isSsrBuild
      ? undefined
      : {
          output: {
            manualChunks: {
              three: ['three', '@react-three/fiber', '@react-three/drei'],
              audio: ['tone'],
              motion: ['framer-motion'],
              state: ['zustand'],
            },
          },
        },
  },
}));
