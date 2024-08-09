import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      '/rest/api/3': {
        target: 'https://whatap-labs.atlassian.net/',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\//, ""),
        secure: false,
        ws: true,
      },
    },
  },
});
