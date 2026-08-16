import { z } from 'zod';

/**
 * Validated, typed access to Vite env vars. Fail fast at boot if a required var
 * is missing/malformed rather than discovering it via a broken request later.
 * Only `VITE_`-prefixed vars are exposed to the browser by Vite.
 *
 * Optional analytics / Meta vars: omit them entirely in dev and the features
 * simply don't load — no errors, no noise.
 */
const schema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),

  // PostHog: client-side events, flags, error tracking.
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().url().optional(),

  // Microsoft Clarity: session recordings / heatmaps (fully free).
  VITE_CLARITY_ID: z.string().optional(),

  // Meta: Embedded Signup v4 + Cloud API.
  VITE_META_APP_ID: z.string().optional(),
  VITE_META_EMBEDDED_SIGNUP_CONFIG_ID: z.string().optional(),
  VITE_META_GRAPH_VERSION: z.string().default('v20.0'),
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

  posthog: parsed.data.VITE_POSTHOG_KEY
    ? {
        key: parsed.data.VITE_POSTHOG_KEY,
        host: parsed.data.VITE_POSTHOG_HOST ?? 'https://app.posthog.com',
      }
    : null,

  clarityId: parsed.data.VITE_CLARITY_ID ?? null,

  meta: {
    appId: parsed.data.VITE_META_APP_ID ?? null,
    embeddedSignupConfigId:
      parsed.data.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID ?? null,
    graphVersion: parsed.data.VITE_META_GRAPH_VERSION,
  },
} as const;
