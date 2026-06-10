import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '@/app/guards/require-auth';
import { RequireGuest } from '@/app/guards/require-guest';
import { RequireOnboarded } from '@/app/guards/require-onboarded';
import { AuthLayout } from '@/layouts/auth-layout';
import { AppLayout } from '@/layouts/app-layout';
import { LoginPage } from '@/pages/auth/login-page';
import { SignupPage } from '@/pages/auth/signup-page';
import { OnboardingMobilePage } from '@/pages/onboarding/onboarding-mobile-page';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';

/**
 * The single, declarative route config (React Router library mode). Branches:
 *   - public (RequireGuest → AuthLayout): /login, /signup (wizard steps 1–2)
 *   - authed, pre-onboarding (RequireAuth → AuthLayout): /onboarding/mobile
 *     (wizard steps 3–4; the page self-redirects home once verified)
 *   - app (RequireAuth → RequireOnboarded → AppLayout): / — an authenticated
 *     user without a verified mobile is bounced back to /onboarding/mobile.
 * Guards are layout routes that render <Outlet/> or redirect.
 */
export const router = createBrowserRouter([
  {
    element: <RequireGuest />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/onboarding/mobile', element: <OnboardingMobilePage /> },
        ],
      },
      {
        element: <RequireOnboarded />,
        children: [
          {
            element: <AppLayout />,
            children: [{ index: true, element: <DashboardPage /> }],
          },
        ],
      },
    ],
  },
]);
