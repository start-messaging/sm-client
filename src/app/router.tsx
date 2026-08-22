import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from '@/app/guards/require-auth';
import { RequireGuest } from '@/app/guards/require-guest';
import { RequireOnboarded } from '@/app/guards/require-onboarded';
import { AuthLayout } from '@/layouts/auth-layout';
import { HubLayout } from '@/layouts/hub-layout';
import { WorkspaceLayout } from '@/layouts/workspace-layout';
import { LoginPage } from '@/pages/auth/login-page';
import { SignupPage } from '@/pages/auth/signup-page';
import { OnboardingMobilePage } from '@/pages/onboarding/onboarding-mobile-page';
import { HomeRedirect } from '@/pages/home-redirect';
import { AcceptInvitePage } from '@/pages/invite/accept-invite-page';
import { CreateWorkspacePage } from '@/pages/services/create-workspace-page';
import { ServicesGalleryPage } from '@/pages/services/services-gallery-page';
import { MembersPage } from '@/pages/workspace/members-page';
import { WorkspaceCatchAll } from '@/pages/workspace/workspace-catch-all';
import { WorkspaceDashboardPage } from '@/pages/workspace/workspace-dashboard-page';
import { ConnectPage } from '@/pages/workspace/connect-page';
import { InboxPage } from '@/pages/workspace/inbox-page';
import { TemplatesPage } from '@/pages/workspace/templates-page';
import { TemplateSamplesPage } from '@/pages/workspace/template-samples-page';
import { TemplateEditorPage } from '@/pages/workspace/template-editor-page';
import { ContactsPage } from '@/pages/workspace/contacts-page';
import { LeadsPage } from '@/pages/workspace/leads-page';
import { CampaignsPage } from '@/pages/workspace/campaigns-page';
import { CreateCampaignPage } from '@/pages/workspace/create-campaign-page';
import { BillingPage } from '@/pages/workspace/billing-page';
import { SettingsPage } from '@/pages/workspace/settings-page';

/**
 * The single, declarative route config (React Router library mode). Branches:
 *   - public (RequireGuest → AuthLayout): /login, /signup (wizard steps 1–2)
 *   - authed, pre-onboarding (RequireAuth → AuthLayout): /onboarding/mobile
 *     (wizard steps 3–4; the page self-redirects home once verified)
 *   - hub (RequireAuth → RequireOnboarded → HubLayout): /services (gallery),
 *     /services/:serviceKey/new (creation wizard) — choosing a context
 *   - workspace (… → WorkspaceLayout): /w/:slug/* — working inside one; the
 *     sidebar scopes to the workspace's service
 *   - `/` is pure redirect: last active workspace, else first, else /services.
 * Guards are layout routes that render <Outlet/> or redirect.
 */
export const router = createBrowserRouter([
  // Public invite landing — reachable logged-out (new invitee signs up) AND
  // logged-in (existing invitee accepts), so it sits outside both guards.
  { path: '/invite/accept', element: <AcceptInvitePage /> },
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
          { index: true, element: <HomeRedirect /> },
          {
            element: <HubLayout />,
            children: [
              { path: '/services', element: <ServicesGalleryPage /> },
              {
                path: '/services/:serviceKey/new',
                element: <CreateWorkspacePage />,
              },
            ],
          },
          {
            path: '/w/:slug',
            element: <WorkspaceLayout />,
            children: [
              { index: true, element: <WorkspaceDashboardPage /> },
              { path: 'connect', element: <ConnectPage /> },
              { path: 'inbox', element: <InboxPage /> },
              { path: 'templates', element: <TemplatesPage /> },
              { path: 'templates/samples', element: <TemplateSamplesPage /> },
              { path: 'templates/new', element: <TemplateEditorPage /> },
              {
                path: 'templates/:id/edit',
                element: <TemplateEditorPage />,
              },
              { path: 'contacts', element: <ContactsPage /> },
              { path: 'leads', element: <LeadsPage /> },
              { path: 'campaigns', element: <CampaignsPage /> },
              { path: 'campaigns/new', element: <CreateCampaignPage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'billing', element: <BillingPage /> },
              { path: 'settings', element: <SettingsPage /> },
              // Unknown module segments fall back to the workspace dashboard.
              { path: '*', element: <WorkspaceCatchAll /> },
            ],
          },
        ],
      },
    ],
  },
]);
