import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Self-signed HTTPS certificate — required for Meta Embedded Signup JS SDK.
    // The FB SDK refuses to load on plain http:// origins; the browser will show
    // a "certificate not trusted" warning on first visit — click "Advanced →
    // Proceed" once, then the warning goes away for the session.
    basicSsl(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // `basicSsl()` above automatically configures HTTPS — no explicit https:true needed here.
  },
})
