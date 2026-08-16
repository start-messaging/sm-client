import fs from 'node:fs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fcmFirebaseConfigPlugin } from './vite-plugin-fcm-config'

/**
 * Prefer locally-trusted certs from `mkcert` when present:
 *   brew install mkcert && mkcert -install
 *   mkdir -p .certs && cd .certs && mkcert localhost 127.0.0.1 ::1
 *   # produces localhost+2.pem / localhost+2-key.pem (or rename to below)
 *
 * Falls back to @vitejs/plugin-basic-ssl (self-signed) — fine for Meta ES
 * after "Proceed", but Chrome often blocks service workers / FCM on that cert.
 */
function localHttps() {
  const dir = path.resolve(__dirname, '.certs')
  const candidates = [
    { cert: 'localhost.pem', key: 'localhost-key.pem' },
    { cert: 'localhost+2.pem', key: 'localhost+2-key.pem' },
    { cert: 'cert.pem', key: 'key.pem' },
  ]
  for (const c of candidates) {
    const certPath = path.join(dir, c.cert)
    const keyPath = path.join(dir, c.key)
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        mode: 'mkcert' as const,
        https: {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        },
      }
    }
  }
  return { mode: 'basicSsl' as const, https: undefined }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expose VITE_* to process.env for the FCM config middleware / writeBundle.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) process.env[key] = value
  }

  const tls = localHttps()

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Self-signed only when mkcert files are missing.
      ...(tls.mode === 'basicSsl' ? [basicSsl()] : []),
      fcmFirebaseConfigPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      https: tls.https,
    },
  }
})
