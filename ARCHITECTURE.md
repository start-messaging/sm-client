# sm-client — Architecture & Contributor Guide

Customer-facing SPA. React 19 + TypeScript + Vite. This doc is the map: where
each kind of code lives, how a request flows, and **exactly how to add a new API
resource or page**. `sm-admin` follows the identical structure.

## Stack

| Concern        | Library                                   |
| -------------- | ----------------------------------------- |
| Server cache   | TanStack Query                            |
| Routing        | React Router (library mode, declarative)  |
| Client state   | Zustand (auth, theme) — **not** Redux     |
| Forms          | React Hook Form + Zod                     |
| HTTP           | Axios (envelope unwrap + token refresh)   |
| UI             | Tailwind v4 + shadcn/ui (radix-nova)      |
| i18n           | i18next (en/hi/ar, browser detect + URL)  |
| Toasts         | Sonner                                    |

## Folder map — one concern per folder

```
src/
  config/      env.ts (zod-validated env), app.ts (APP_ID + storageKey), languages.ts
  types/       api.ts (backend contract: enums + request/response types), error.ts (ApiError)
  lib/         utils.ts (cn), http.ts (axios instance), query-client.ts (+STALE),
               i18n.ts, toast.ts, errors.ts, storage.ts  ← cross-cutting INSTANCES/utilities
  hooks/       app-wide UI hooks (use-query-param, use-debounced-value)
  api/         endpoints.ts (route paths), query-keys.ts (cache keys),
               <resource>.api.ts (raw calls), hooks/use-<resource>.ts (Query hooks)
  stores/      auth.store.ts, theme.store.ts (Zustand)
  components/  ui/ (shadcn — CLI-managed, do not hand-edit)
               shared/ (reusable presentational: theme-toggle, language-switcher)
               layout/ (the app shell's parts: app-sidebar, user-menu, workspace-switcher)
  layouts/     auth-layout.tsx (public chrome), app-layout.tsx (shadcn SidebarProvider + Outlet)
  pages/       <feature>/<feature>-page.tsx (+ schemas.ts + components/) — one folder per page
  app/         router.tsx (route config), providers.tsx, guards/ (RequireAuth, RequireGuest)
  locales/     en/ hi/ ar/ translation.json
```

**Component tiers** — put a component in the first matching bucket:
`ui/` = stock shadcn primitive · `shared/` = reusable *presentational* component
used by 2+ pages (no data fetching, no domain rules) · `layout/` = the app shell's
fixed parts · a page's own `components/` = UI used only by that one page. All data
access stays central in `api/` — pages never fetch directly.

## Routing (React Router — library mode)

Routes are declared in **one place**, `app/router.tsx`, via
`createBrowserRouter([...])`. No file-based scanning, no codegen, no
`routeTree.gen.ts`. A **page is a plain component** in `src/pages/`; the router
maps a URL to it. Guards and layouts are "layout routes" that render `<Outlet/>`.

```
app/router.tsx
  RequireGuest  →  AuthLayout  →  /login  /signup  /verify-otp
  RequireAuth   →  AppLayout   →  /(index, dashboard)  /members

src/
  app/
    router.tsx                     createBrowserRouter([...]) — the route table
    guards/require-auth.tsx        no session → <Navigate to="/login?redirect=…">; else <Outlet/>
    guards/require-guest.tsx       logged in → <Navigate to="/">; else <Outlet/>
  layouts/
    auth-layout.tsx                centered card + switchers; <Outlet/>
    app-layout.tsx                 the shell (sidebar/topbar) + /me rehydrate; <Outlet/>
  pages/
    auth/
      schemas.ts                   zod form schemas shared by the auth pages
      login-page.tsx  signup-page.tsx  verify-otp-page.tsx
    dashboard/dashboard-page.tsx
    members/
      members-page.tsx             the page container
      components/members-table.tsx page-private UI (only members uses it)
```

Conventions:
- **Add/realign a URL in `app/router.tsx`** — it's the single source of truth for
  the route table. Guards wrap a branch; the layout wraps its pages; the page is
  the leaf `element`.
- **A page is `pages/<feature>/<feature>-page.tsx`**, kept thin: read params,
  call `@/api` hooks, render. Heavy/standalone markup → a sibling `components/`
  folder (plain folder, no `-` prefix — nothing scans `pages/`).
- **URL search params** are read with `useSearchParams()` and validated with a
  Zod schema in the page (e.g. verify-otp's `?token&email`); invalid → `<Navigate>`.
- A component reused by **2+ pages** graduates out of a page's `components/` into
  `components/shared/` — never import another page's `components/`.
- **Guards live in `app/guards/`** and gate by `useAuthStore().isAuthenticated()`.
  Protected pages sit under the `RequireAuth` branch; auth pages under
  `RequireGuest`.
- **Data never lives in `pages/`** — calls/hooks/types stay central in `api/`.
  A page imports `useMembers()` from `@/api/hooks`; it never defines fetching.

**The dividing line:** an *instance/utility* (the axios client, the QueryClient,
`cn`) lives in `lib/`. A *resource descriptor* (a URL path, a cache key, a typed
call, a hook) lives in `api/`. UI primitives are stock shadcn in `components/ui/`;
page-specific UI lives in that page's `components/`.

## Request lifecycle (read this once)

```
page (pages/members/members-page.tsx)
  → calls a hook            (api/hooks/use-members.ts)        ← useQuery/useMutation
    → calls an api fn       (api/members.api.ts)              ← typed, thin
      → uses a path         (api/endpoints.ts)
      → via http helper     (lib/http.ts: apiGet/Post/Patch/Delete)
        → axios instance attaches the access token, hits the backend
        ← response interceptor unwraps { data, meta } → returns the payload
        ← on 401: single-flight refresh (rotating token) → replay
      ← errors normalized to ApiError (types/error.ts)
    ← TanStack Query caches by query-key (api/query-keys.ts)
  ← component renders data; toast.error(err) shows a localized message
```

Client state (tokens, theme) lives in `stores/`; server state lives in Query.
Never store fetched server data in Zustand.

## ▶ How to add a new API resource + page (the recipe)

Say you're adding **Contacts** (`GET /v1/contacts`, `POST /v1/contacts`).

1. **Types** — `src/types/api.ts`
   Add the response + request interfaces (and any enum) mirroring the backend:
   ```ts
   export interface Contact { id: string; name: string; phone: string; }
   export interface CreateContactBody { name: string; phone: string; }
   ```

2. **Endpoint paths** — `src/api/endpoints.ts`
   Add a group (paths only, versioned via `v1()`):
   ```ts
   contacts: { list: v1('/contacts'), create: v1('/contacts'),
               byId: (id: string) => v1(`/contacts/${id}`) },
   ```

3. **Cache keys** — `src/api/query-keys.ts`
   ```ts
   contacts: { all: (workspaceId: string) => ['contacts', workspaceId] as const },
   ```
   (Workspace-scoped data MUST include `workspaceId` so a workspace switch
   isolates it.)

4. **API functions** — `src/api/contacts.api.ts` (new file, thin)
   ```ts
   export const contactsApi = {
     list: () => apiGet<Contact[]>(endpoints.contacts.list),
     create: (body: CreateContactBody) => apiPost<Contact>(endpoints.contacts.create, body),
   };
   ```

5. **Hooks** — `src/api/hooks/use-contacts.ts` (new file)
   `useQuery` for reads (pick a `STALE` preset), `useMutation` for writes
   (invalidate the resource's key on success). Mirror `use-members.ts`.

6. **Page** — `src/pages/contacts/contacts-page.tsx`
   - The page container, thin: read params (`useSearchParams` + Zod if it has
     URL state), call the `@/api` hooks, render. Renders at `/contacts`.
   - Page-private UI → `src/pages/contacts/components/contacts-table.tsx`.
     (Reused by another page later? move it to `components/shared/`.)
   - Register it in **`src/app/router.tsx`** under the `RequireAuth` → `AppLayout`
     branch: `{ path: '/contacts', element: <ContactsPage /> }`.
   - Add it to the sidebar `NAV` in `src/components/layout/app-sidebar.tsx`.

7. **i18n** — add strings to `src/locales/{en,hi,ar}/translation.json` and use
   `t('...')`; map any new backend error code under the `errors.*` block.

8. Run `npm run format && npm run lint && npm run typecheck`.

That's the whole loop — types → endpoint → key → api fn → hook → page. No other
files need touching.

## Adding UI components (shadcn)

Stock shadcn, CLI-managed — **don't hand-edit `components/ui/*`** (re-running
`add --overwrite` would clobber edits):

```bash
npx shadcn@latest add dialog table tabs tooltip   # whatever you need
npm run format                                     # normalize to our quotes/semis
```

The one deliberate non-stock tweak: `ui/sonner.tsx` reads our Zustand
`theme.store` instead of `next-themes` (we don't install it). Re-apply that
one-line import swap if you ever re-add `sonner`. For forms use stock
`Field/FieldLabel/FieldError`; for button loading use `<Spinner/>` inside a
`disabled` button (stock Button has no `loading` prop).

## Utilities you'll reach for

**URL search / filter inputs → `useQueryParam` (`@/hooks/use-query-param`).**
Binds one `?param=` to an input; the URL is the source of truth (shareable,
bookmarkable, Back-button works). Typing is instant; the URL write + the
`debouncedValue` update are debounced (300ms default) so a server search doesn't
fire per keystroke. (Standalone `useDebouncedValue` is also exported.)

```tsx
const { value, debouncedValue, setValue } = useQueryParam('q');
<Input value={value} onChange={(e) => setValue(e.target.value)} />
const { data } = useThings(debouncedValue);  // fires on pause; put in the query key
```
(Seeds from the URL once at mount; to re-sync to an external `?q=` change without
remount, give the consumer a `key` that includes the param.)

**Browser storage → `storage` (`@/lib/storage`).** Keys are auto-namespaced by
`APP_ID`; all access is try/catch-guarded (private mode / quota / disabled never
throw).
- `storage.local.set(key, val, ttlMs?)` — omit `ttlMs` for permanent; pass it to
  **auto-expire** (lazy: a `get` past expiry removes it and returns `null`).
- `storage.local.get<T>(key)` / `storage.local.remove(key)`.
- `storage.cookie.set(name, val, { maxAgeSec, sameSite, secure, path })` /
  `storage.cookie.get(name)` / `storage.cookie.remove(name)`.

```ts
storage.local.set('recent-search', q, 24 * 60 * 60 * 1000); // expires in 24h
const recent = storage.local.get<string>('recent-search');  // null once expired
```
Note: Zustand stores already persist via their own middleware — use `storage`
for ad-hoc values (recents, dismissed banners, short-lived caches), not to
re-implement the auth/theme stores.

## Conventions

- **Types mirror the backend in ONE place** (`types/api.ts`). A backend change →
  one file to update.
- **No hardcoded URLs** outside `api/endpoints.ts`; no hardcoded cache keys
  outside `api/query-keys.ts`.
- **Workspace switch** resets the whole Query cache before flipping the active
  workspace (`use-auth.ts useSwitchWorkspace`) — cache isolation.
- `config/app.ts` (`APP_ID`) is the ONE file that differs between sm-client and
  sm-admin; every localStorage key derives from it.
- Shared, app-agnostic files (`components/ui/*`, `lib/{utils,query-client,toast,
  errors,storage}`, `hooks/*`, `stores/theme.store`, `app/guards/*`,
  eslint/prettier config) are kept **byte-identical** across both apps.

## Scripts

```bash
npm run dev          # dev server (port 5173)
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b
npm run lint         # eslint (incl. @tanstack/query rules)
npm run format       # prettier --write
npm run format:check # prettier --check (CI)
```
