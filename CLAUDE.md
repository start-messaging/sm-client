# CLAUDE.md — sm-client

Guidance for Claude Code / Cursor working in this repo. Read this before
writing UI. For the full architecture (folders, request flow, "add a resource"
recipe), see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Workspace hub (read first)

- Hub: [../.claude/CLAUDE.md](../.claude/CLAUDE.md)
- WhatsApp plan: [../.claude/plans/whatsapp-deep-build-plan.md](../.claude/plans/whatsapp-deep-build-plan.md)
- Skills: [../.claude/skills/whatsapp-educational-ux/SKILL.md](../.claude/skills/whatsapp-educational-ux/SKILL.md), [whatsapp-product](../.claude/skills/whatsapp-product/SKILL.md)

**Product:** Customer WhatsApp CRM SPA (`whatsapp.startmessaging.com`). Prefer WhatsApp-only IA (not multi-service gallery). Educational UX + Meta payment-method gates required. Tech Provider: never “add funds to send.” Backend: `sm-server`. Admin: `sm-admin`.

## Golden rule: always use a shadcn/ui component — never hand-roll raw HTML

If a UI need maps to a shadcn component, **use it** (or add it via the CLI). Do
NOT write raw `<table>`, `<select>`, `<dialog>`, `<input type="checkbox">`,
tab `<div role="tab">`, toast divs, etc. Stock shadcn gives us accessibility,
keyboard handling, focus management, dark-mode tokens, and consistency for free.

- **Need a component that's already installed** (see list) → import it from
  `@/components/ui/<name>`.
- **Need one that isn't installed yet** → add it: `npx shadcn@latest add <name>`,
  then `npm run format`. It lands in `src/components/ui/` and is then a normal
  import. Keep `src/components/ui/*` byte-identical with sm-admin.
- Only write bespoke markup when **no** shadcn primitive fits — and then compose
  it from shadcn primitives + Tailwind, in `components/shared/` (reusable) or the
  page's own `components/` (page-private).

### Installed now (import from `@/components/ui/<name>`)

`avatar` · `badge` · `button` · `card` · `checkbox` · `command` · `dialog` ·
`dropdown-menu` · `field` · `hover-card` · `input` · `input-otp` · `label` ·
`popover` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` ·
`slider` · `sonner` (Toaster) · `spinner` · `switch` · `table` · `tabs` ·
`tooltip`

### The service-first shell (routes, layouts, nav)

The app has TWO authed shells. **HubLayout** (`layouts/hub-layout.tsx`, no
sidebar) hosts `/services` (the gallery) and `/services/:key/new` (minimal
create wizard — name only; country/currency/plan are server-locked).
**WorkspaceLayout** (`layouts/workspace-layout.tsx`) hosts `/w/:slug/*`: it
resolves the slug via `useWorkspace`, remembers it (`setActiveContext` → the
persisted store feeds the `/` redirect in `pages/home-redirect.tsx`: last
workspace → first → gallery), bounces 404s back to `/services`, and passes the
workspace to pages via Outlet context (`hooks/use-current-workspace.ts`).

**The sidebar is service-scoped and registry-driven**: `config/service-nav.ts`
maps service key → modules (plus `COMMON_NAV`). Adding a service = one registry
entry; modules not yet built are `comingSoon: true` and render disabled with an
InfoTip — never add dead routes. The **9-dot launcher**
(`components/shared/service-launcher.tsx`, in `header-actions.tsx`): hover =
panel of my services/workspaces, click = `/services`. The sidebar header is the
same-service workspace switcher. The shell uses the **`sidebar`** block
(`components/layout/workspace-sidebar.tsx`); don't hand-roll a shell.

**Hints**: `components/shared/info-tip.tsx` is the ONE way to attach
explanatory hints (ⓘ tooltip); use `rich` (HoverCard) when content needs media
or links — that mode is reserved for future walkthrough videos.

**Plan gating**: the workspace payload carries `planFeatures`/`planLimits` —
OPEN key-value sets the server can extend without a deploy. Gate UI through
`lib/plan.ts` (`hasFeature` / `featureValue` / `planLimit`), never by reading
the records inline: absent feature = off, absent/null limit = unlimited, and
client checks are UX only (the server enforces). The one display-only exception
is `pages/workspace/components/plan-panel.tsx` ("Your plan" card), which renders
the raw records; entitlement labels resolve via `plan.keys.*` i18n with a
humanised fallback so keys added by admins still render untranslated.
**Making a key actionable?** Server enforcement comes FIRST — follow the
checklist in `sm-server/CLAUDE.md` § "Authorization model" (register the key,
server check, e2e the direct API call), and only then gate the UI here.

### Registration wizard + onboarding gate (this app's auth flow)

Registration is a **4-step wizard**: guest `/signup` holds steps 1–2 (details →
email OTP; there is no `/verify-otp` route). Email verification issues the
session, then steps 3–4 run on the **authenticated** `/onboarding/mobile` route
(country `command`+`popover` Combobox + national number, validated with
`libphonenumber-js/min` in `pages/onboarding/schemas.ts`; server re-validates
with `/max` and derives the country). `app/guards/require-onboarded.tsx` sits
between `RequireAuth` and `AppLayout`: any session with `user.mobileVerified ===
false` is funnelled to `/onboarding/mobile`. The shared step indicator is
`components/shared/onboarding-stepper.tsx`. The home (`pages/dashboard/`) shows
the services available in the user's country (`useAvailableServices`) with a
stubbed "Start a workspace" CTA — the workspace slice replaces the stub. The
pre-reset workspace UI (switcher, members) was deleted, not hidden; rebuild it
from the real API contract when workspaces land.

**The wizard is resumable — keep it that way.** In-flight OTP state
({destination, verificationToken} ONLY — **never persist passwords**) lives in
per-tab sessionStorage via `lib/wizard-storage.ts` (`signupWizardStore` /
`mobileWizardStore`, TTL = the server's `expiresInSec`), so a reload restores
step 2/4 (email masked via `lib/mask.ts`) instead of dead-ending. The OTP entry
step is ONE shared component — `components/shared/otp-card.tsx` (6-digit
`input-otp` form + resend button with a countdown from `hooks/use-countdown`,
always seeded from server values: `resendCooldownSec` on success, the 429's
`details.retryAfterSec`). Email resend hits `POST /auth/resend-otp`
(token-keyed); mobile resend re-POSTs `/auth/mobile` with the same number.
Login with an unverified email gets `USER_NOT_VERIFIED` + recovery `details`
(token et al.) → the login page writes `signupWizardStore` and routes to
`/signup`, which resumes at step 2. Re-POSTing signup with an unverified email
is NOT an error (server resumes the registration); `EMAIL_TAKEN` only means a
verified account exists. Cross-tab races resolve via server codes
(`EMAIL_ALREADY_VERIFIED` → go log in; `MOBILE_ALREADY_VERIFIED` → refetch
`/auth/me` and `setUser`), never via storage events.

### Available to add on demand (`npx shadcn@latest add <name>`)

Layout/containers: `accordion` `aspect-ratio` `collapsible` `resizable`
`scroll-area` `sheet` `sidebar` `tabs`
Overlays: `alert-dialog` `dialog` `drawer` `hover-card` `popover` `tooltip`
`context-menu` `menubar` `navigation-menu` `command`
Forms/inputs: `checkbox` `radio-group` `select` `slider` `switch` `textarea`
`toggle` `toggle-group` `input-otp` `calendar` `date-picker` `form` `combobox`
Data/feedback: `alert` `progress` `skeleton` `pagination` `breadcrumb`
`carousel` `chart`

(That's the shadcn registry — confirm a name with `npx shadcn@latest add` if
unsure; the CLI lists/validates.)

### Component-choice cheatsheet (need → use)

| Need | shadcn component |
|------|------------------|
| Tabular data | **`table`** (Table/TableHeader/TableBody/TableRow/TableHead/TableCell) |
| Single-select dropdown | `select` (NOT `<select>`) |
| Searchable select / command palette | `command` (often in a `popover`) |
| Yes/no toggle | `switch`; multi-choice → `checkbox` / `radio-group` |
| Modal | `dialog`; destructive confirm → `alert-dialog` |
| Side panel | `sheet` |
| Multi-line text | `textarea` |
| Contextual hint | `tooltip`; richer → `hover-card` / `popover` |
| Loading placeholder | `skeleton`; inline spinner → `spinner` |
| Sectioned content | `tabs` / `accordion` |
| Inline status/label | `badge` |
| OTP entry | `input-otp` |
| Form scaffolding | `field` (already used) or `form` for RHF-bound groups |

## shadcn rules

- **Never hand-edit `src/components/ui/*`** — they're CLI-managed/stock; re-running
  `add --overwrite` would clobber edits. Customize by composing, not editing.
- The CLI emits double-quotes/no-semis; run `npm run format` after any `add`.
- Two deliberate non-stock tweaks (re-apply if you re-add these): `ui/sonner.tsx`
  reads our Zustand `theme.store` (we don't install `next-themes`); and
  `hooks/use-mobile.ts` (shipped by the `sidebar` block) is rewritten to
  `useSyncExternalStore` so it passes `react-hooks@7` (the stock setState-in-effect
  version fails lint).
- Stock Button has **no `loading` prop** → use `<Spinner/>` inside a `disabled`
  button. Forms use `field` (`Field`/`FieldLabel`/`FieldError`).

## Other conventions (see ARCHITECTURE.md for detail)

- **Data layer is central in `api/`** — `endpoints.ts` (paths), `query-keys.ts`,
  `<resource>.api.ts`, `hooks/use-<resource>.ts`. Pages never fetch directly.
- **Types mirror the backend in ONE file**: `types/api.ts`.
- **Routing**: React Router library mode, one route table in `app/router.tsx`;
  pages in `pages/<feature>/`, guards in `app/guards/`, layouts in `layouts/`.
- **URL search/filter inputs** → `@/hooks/use-query-param` (debounced, URL-synced).
- **Browser storage** → `@/lib/storage` (localStorage+TTL / cookies, namespaced).
- **All user-visible text is i18n** — `t('...')`; never hardcode copy. Strings
  live in `src/locales/{en,hi,ar}/translation.json`.
- **Brand name**: `t('common.appName')` in UI; `APP_NAME` constant
  (`config/app.ts`) only for non-React contexts (e.g. document title).
- **Symmetry**: sm-client and sm-admin keep `components/ui/*`, shared `lib/*`,
  `hooks/*`, `stores/theme.store`, `app/guards/*`, and tooling config
  **byte-identical**. `config/app.ts` (`APP_ID`/`APP_NAME`) is the only intended
  per-app difference.

## Gates (run before declaring done)

```bash
npm run typecheck && npm run lint && npm run format && npm run build
```
