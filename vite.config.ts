import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  base: 'jira-timeline',
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
      '/ex/jira': {
        target: 'https://api.atlassian.com/',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\//, ""),
        secure: false,
        ws: true,
      },
    },
  },
});
