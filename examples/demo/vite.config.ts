import { defineConfig } from 'vite';
import { mockRender } from './mock-render';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    {
      name: 'local-demo-renders',
      configureServer(server) {
        server.middlewares.use(mockRender);
      },
      configurePreviewServer(server) {
        server.middlewares.use(mockRender);
      },
    },
  ],
});
