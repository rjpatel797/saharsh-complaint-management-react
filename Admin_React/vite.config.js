import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'polyfill-global',
      transformIndexHtml(html) {
        // Inject global polyfill script before any module scripts
        const polyfillScript = `
    <script>
      // Polyfill for 'global' variable (required by sockjs-client)
      (function() {
        if (typeof global === 'undefined') {
          if (typeof window !== 'undefined') {
            window.global = globalThis;
          } else if (typeof self !== 'undefined') {
            self.global = globalThis;
          } else {
            this.global = globalThis;
          }
        }
      })();
    </script>`;
        return html.replace('<head>', `<head>${polyfillScript}`);
      },
    },
  ],
  optimizeDeps: {
    include: ['sockjs-client', '@stomp/stompjs'],
  },
})
