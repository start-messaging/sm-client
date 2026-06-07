import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import './lib/i18n'; // initialize i18next before first render
import { APP_NAME } from '@/config/app';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';

// Browser tab title — non-React context, so it uses the canonical APP_NAME
// constant (not i18n). Single source: change the brand in config/app.ts only.
document.title = APP_NAME;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
