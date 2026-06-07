import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '@/app/guards/require-auth';
import { RequireGuest } from '@/app/guards/require-guest';
import { AuthLayout } from '@/layouts/auth-layout';
import { AppLayout } from '@/layouts/app-layout';
import { LoginPage } from '@/pages/auth/login-page';
import { SignupPage } from '@/pages/auth/signup-page';
import { VerifyOtpPage } from '@/pages/auth/verify-otp-page';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { MembersPage } from '@/pages/members/members-page';

/**
 * The single, declarative route config (React Router library mode). Two branches:
 *   - public (RequireGuest → AuthLayout): /login, /signup, /verify-otp
 *   - protected (RequireAuth → AppLayout/shell): /, /members
 * Guards are layout routes that render <Outlet/> or redirect. Pages are plain
 * components in src/pages/; data comes from @/api hooks.
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
          { path: '/verify-otp', element: <VerifyOtpPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: '/members', element: <MembersPage /> },
        ],
      },
    ],
  },
]);
