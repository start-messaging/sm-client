import { z } from 'zod';

/**
 * Validated, typed access to Vite env vars. Fail fast at boot if a required var
 * is missing/malformed rather than discovering it via a broken request later.
 * Only `VITE_`-prefixed vars are exposed to the browser by Vite.
 *
 * Optional analytics / Meta / Firebase vars: omit them entirely in dev and the
 * features simply don't load — no errors, no noise.
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

  // Firebase Cloud Messaging (web push) — all-or-nothing optional block.
  VITE_FIREBASE_API_KEY: z.string().optional(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().optional(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  VITE_FIREBASE_APP_ID: z.string().optional(),
  VITE_FIREBASE_VAPID_KEY: z.string().optional(),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    z.treeifyError(parsed.error),
  );
  throw new Error('Invalid environment variables — see console.');
}

const d = parsed.data;

const firebaseConfigured =
  !!d.VITE_FIREBASE_API_KEY &&
  !!d.VITE_FIREBASE_PROJECT_ID &&
  !!d.VITE_FIREBASE_MESSAGING_SENDER_ID &&
  !!d.VITE_FIREBASE_APP_ID &&
  !!d.VITE_FIREBASE_VAPID_KEY;

export const env = {
  apiBaseUrl: d.VITE_API_BASE_URL.replace(/\/$/, ''),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  posthog: d.VITE_POSTHOG_KEY
    ? {
        key: d.VITE_POSTHOG_KEY,
        host: d.VITE_POSTHOG_HOST ?? 'https://app.posthog.com',
      }
    : null,

  clarityId: d.VITE_CLARITY_ID ?? null,

  meta: {
    appId: d.VITE_META_APP_ID ?? null,
    embeddedSignupConfigId: d.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID ?? null,
    graphVersion: d.VITE_META_GRAPH_VERSION,
  },

  firebase: firebaseConfigured
    ? {
        apiKey: d.VITE_FIREBASE_API_KEY!,
        authDomain:
          d.VITE_FIREBASE_AUTH_DOMAIN ??
          `${d.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: d.VITE_FIREBASE_PROJECT_ID!,
        messagingSenderId: d.VITE_FIREBASE_MESSAGING_SENDER_ID!,
        appId: d.VITE_FIREBASE_APP_ID!,
        vapidKey: d.VITE_FIREBASE_VAPID_KEY!,
      }
    : null,
} as const;
