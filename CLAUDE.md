# CLAUDE.md — sm-client

Guidance for Claude Code (and developers) working in this repo. Read this before
writing UI. For the full architecture (folders, request flow, "add a resource"
recipe), see [ARCHITECTURE.md](./ARCHITECTURE.md).

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

`avatar` · `badge` · `button` · `card` · `checkbox` · `dialog` ·
`dropdown-menu` · `field` · `input` · `label` · `select` · `separator` · `sheet` ·
`sidebar` · `skeleton` · `slider` · `sonner` (Toaster) · `spinner` · `table` ·
`tabs` · `tooltip`

The app shell uses the **`sidebar`** block (responsive: fixed rail on desktop,
slide-in sheet on mobile via `SidebarTrigger`) — see `layouts/app-layout.tsx` +
`components/layout/app-sidebar.tsx`. Don't hand-roll a `<aside hidden md:flex>`
shell; use `SidebarProvider`/`Sidebar`/`SidebarInset`.

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
