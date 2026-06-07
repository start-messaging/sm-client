import { z } from 'zod';

/**
 * Validated, typed access to Vite env vars. Fail fast at boot if a required var
 * is missing/malformed rather than discovering it via a broken request later.
 * Only `VITE_`-prefixed vars are exposed to the browser by Vite.
 */
const schema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    z.treeifyError(parsed.error),
  );
  throw new Error('Invalid environment variables — see console.');
}

export const env = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/$/, ''),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
