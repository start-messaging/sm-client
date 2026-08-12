import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import posthog from 'posthog-js';
import './index.css';
import './lib/i18n'; // initialize i18next before first render
import { APP_NAME } from '@/config/app';
import { env } from '@/config/env';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';

// Browser tab title — non-React context, so it uses the canonical APP_NAME
// constant (not i18n). Single source: change the brand in config/app.ts only.
document.title = APP_NAME;

// ── PostHog (product analytics + flags + error tracking) ─────────────────────
// Only initializes when the key is present — no-op in local dev without it.
if (env.posthog) {
  posthog.init(env.posthog.key, {
    api_host: env.posthog.host,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
}

// ── Microsoft Clarity (session recordings + heatmaps — fully free) ────────────
// Injected as an inline script rather than a static import so Vite doesn't
// bundle Clarity. Only runs when VITE_CLARITY_ID is set.
if (env.clarityId) {
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${env.clarityId}");`;
  document.head.appendChild(s);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
