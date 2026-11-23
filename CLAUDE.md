@AGENTS.md

# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Function/component declaration style

Follow these rules in every hand-written `.ts`/`.tsx` file:

| What you're writing | Style |
|---|---|
| React component | `const` + arrow, exported directly — `export const NavUser = () => { ... }` |
| Custom hook | `const` + arrow — `export const useIsMobile = () => { ... }` |
| Plain helper/utility function | `const` + arrow — `const getInitials = (name) => { ... }` |
| Default-exported page/layout component | named `const` first, then `export default` — `const Page = () => {...}; export default Page;` |
| Next.js route handler (`app/api/**/route.ts`) | `const` + arrow, exported directly — `export const POST = async (req) => { ... }` |
| Inline/anonymous (event handlers, `.map`/`.filter`, `useEffect`/`useState` bodies) | arrow function |

**Exception:** `components/ui/` is shadcn CLI output (`function ComponentName(props) { ... }`). Never convert it — leave it in generated style so future `npx shadcn add`/updates don't get overwritten or diverge.

## Comment style

The codebase has historically been under-commented. Every new component, hook, function, and non-obvious variable should carry a short comment explaining intent — not restating the code.

- **Components** get a JSDoc-style block above the declaration, using `@` tags:

  ```tsx
  /**
   * @component NavUser
   * @description Renders the signed-in user's avatar and account dropdown in the sidebar footer.
   */
  export const NavUser = () => { ... }
  ```

  Add `@param` for non-trivial props when it clarifies usage.

- **Hooks, plain functions, and important/non-obvious variables** get a single `//` line directly above them, stating *why*/*what*, not a restatement of the syntax:

  ```ts
  // Tracks whether the viewport is below the mobile breakpoint.
  export const useIsMobile = () => { ... }

  // Extracts up to two initials from a full name for the avatar fallback.
  const getInitials = (name: string) => { ... }

  // Debounce timer id — cleared on unmount to avoid a stray state update.
  const timeoutRef = useRef<NodeJS.Timeout>();
  ```

- Skip comments only for self-evident local variables (loop indices, trivial destructures) and for generated code under `components/ui/`.

## Stack and libraries

Package manager is **bun** (`packageManager: bun@1.4.4`) — use `bun add` / `bun install`, not npm.

Already installed: Next.js 16 (App Router), React 19, Tailwind v4, shadcn (`base-vega` style on `@base-ui/react`), `lucide-react`, `next-themes`, `recharts`, `date-fns`, `class-variance-authority`.

Also installed: `@tanstack/react-query` (v5, server state), `axios` (one shared instance in `lib/axios.ts`), `zod` (forms and API payloads), `bcryptjs`, Prisma 7 (MySQL, mariadb adapter).

If a task needs a library that isn't in `package.json`, say so and install it rather than importing it blindly.

## Project structure

All source is under `src/`; the `@/*` alias maps to `src/*`.

```
src/
  app/                       routes only — thin pages, layouts, globals.css
  components/
    ui/                      shadcn primitives (generated style, see exception above)
    providers/               app-wide providers (theme, query)
    <shared>.tsx             reusable app components used by 2+ features
  features/<feature>/
    _components/             feature UI (*-view.tsx, forms, tables)
    hooks/                   TanStack Query hooks (use-*.ts)
    api/index.ts             axios functions
    types.ts                 request/response types
    schemas.ts               zod schemas (if the feature has forms)
  hooks/                     reusable hooks not tied to one feature (use-mobile.ts)
  lib/                       shared utilities (axios.ts, jwt.ts, utils.ts, get-error-message.ts)
```

- Pages in `app/` stay thin: they render one feature view and contain no logic.
- Files are kebab-case. Folders prefixed `_` are private to their feature.
- Import with the `@/` alias, never long `../../..` chains (same-feature `../` is fine).

## Reusability rules

- **Before writing a component, hook or helper, search for an existing one** (`src/components`, `src/components/ui`, `src/hooks`, `src/lib`) and reuse or extend it.
- Rule of three: code used in 1 feature lives in that feature; once a second feature needs it, move it to `components/`, `hooks/` or `lib/`.
- Reusable components take data and callbacks via props, accept a `className` and merge it with `cn()`, and contain no API calls.
- Compose shadcn primitives (`Button`, `Card`, `Input`, `Field`…) instead of hand-styling raw elements. Add missing primitives with `bunx shadcn add <name>`.
- Don't duplicate helpers: `cn` comes from `@/lib/utils`, error text from `getErrorMessage`.
- Dates: never use `<input type="date">`. Use `DatePicker` from `@/components/date-picker` (shadcn Calendar in a Popover). It takes and returns `"yyyy-MM-dd"` strings; pass `clearable` for optional filters and `min`/`max` to limit days.

## Styling and branding (KishtoPe theme)

**Always follow the branding instructions in `public/brand.html`** (colours, fonts, type sizes, tone, graphics and photo rules) for all UI work. The file is ~11.5MB because of embedded images/fonts, so don't read it whole: search it or read it in portions (e.g. `grep`/`cut -c1-300`).

The theme lives in `src/app/globals.css`; **use the tokens, never hard-code hex values** in components.

- Colors: `bg-background` (cream `#FBF8F3`), `text-foreground` (navy `#0F1B3D`), `bg-primary` (navy), `bg-accent` (orange `#F77D48`), `text-muted-foreground`, `border-border`, `ring-ring` (cobalt `#2D53A4`), `bg-destructive`. Brand extras: `bg-brand-orange`, `bg-brand-navy`, `bg-brand-cobalt`, `bg-brand-cream`, `bg-brand-ember` (orange *text* on light backgrounds, bold/large only — plain orange text fails contrast), `bg-brand-sky`, `bg-brand-peach`, `bg-brand-deep`, `bg-success` (Leaf, success messages only). Source of truth: `public/brand.html`. On orange use navy text, never white; no orange text on cream/white.
- Fonts: Inter for body/UI (`font-sans`), Anek Devanagari Condensed ExtraBold for headings (`font-heading`; `h1`–`h4` get weight 700, normal width, line-height 1.15, tracking −1% automatically; the condensed 75% width is only for `.display-number` and hero text). Sentence case headings, no italics/outlines. Kicker labels (small uppercase bold, tracked) use the `.kicker` class; big stats use `.display-number`. Type sizes: `text-display` (118px hero H1), `text-h2` (60px); otherwise standard Tailwind sizes.
- Radius: base `--radius` is 14px. Buttons are `rounded-md`; badges, tabs are pills (`rounded-full`); inputs/selects/popovers/menus 14px; cards, tables, alerts, toasts 18px; dialogs/large panels 22px.
- Shadows: cards are flat (1px `border-border` ring, no shadow, per the brand's "no glassy cards"); `shadow-float` is for popovers/dialogs, `shadow-hero` for hero visuals. Buttons have no shadow.
- Buttons: `variant="default"` (navy), `"accent"` (orange CTA), `"outline"`, `"secondary"`, `"ghost"`, `"destructive"`; default height 44px.
- Dark mode is driven by `next-themes` (`dark` class). Use semantic tokens so both themes work.

## List pages: tables, filters and search (follow the Visitors page)

Every page that lists data in a table (Parcels, Stationery, Library, …) must follow the same structure as `src/features/visitors/_components/visitors-view.tsx` and `visitors-table.tsx`. Copy that pattern rather than inventing a new layout.

- **Page shell:** compose the entity components in `src/components/entity-components/`: `EntityContainer` (with `header`, `search`, `pagination` slots), `EntityHeader` (title, description, "New …" button via `onNew`), `EntitySearch`, `EntityPagination`, `LoadingView`, `ErrorView`, `EntityEmptyView`. Don't rebuild these.
- **Render order:** `isPending` -> `LoadingView`, `isError` -> `ErrorView` (message via `getErrorMessage`), empty -> `EntityEmptyView` (message differs when filters are active; offers `onNew`), otherwise the table.
- **Table:** always a table (not cards) via the shared `DataTable` (`src/components/data-table.tsx`, built on `ui/table` + `ScrollArea` so it scrolls horizontally inside its own box). Each feature has a `<feature>-table.tsx` that only defines the columns. Primary column shows an `Avatar` with initials or icon plus a muted second line; use `Badge` for status; row actions are `Button size="sm" variant="outline"` with a `data-icon` icon and `Spinner` while pending (`isPending && variables?.id === row.id`); destructive/irreversible actions confirm through `AlertDialog`. Show `-` for empty optional values.
- **Toolbar (the `search` slot):** a row (`flex flex-wrap items-center gap-2`) containing, in order: status/option filter as a `ToggleGroup variant="outline"` (always one option selected; ignore the empty array on re-click), a date filter as `InputGroup` + `CalendarIcon` with an X `InputGroupButton` to clear it, a "Clear filters" ghost button shown only while a filter is active, and `EntitySearch` on the right. Below it, a muted "Showing x–y of N …" summary line.
- **Filter state:** lives in a `use-<feature>-params.ts` hook (search, filters, page) built on the shared `useUrlListParams` (`src/hooks/use-url-list-params.ts`), so it is kept in the URL (`?q=&status=&date=&page=`), survives reload and can be shared as a link. Defaults are never written to the URL; declare each filter's default and accepted values so a hand-edited URL falls back safely. Search is debounced (~300ms) before it reaches the URL and the query key, and any filter change resets `page` to 1. Server does the filtering and pagination: the list endpoint takes `search`, filters, `page`, `pageSize` and returns `{ items, total, page, pageSize }`.
- **Pagination:** `EntityPagination` in the `pagination` slot with `totalPages = ceil(total / pageSize)` and `disabled={isPlaceholderData}`; the table gets `opacity-60` while `isPlaceholderData`. Use `keepPreviousData` in the list hook.
- **Create/edit forms:** open in `FormDialog` (fixed header/footer, `ScrollArea` body), sectioned with `FieldSet` + `FieldLegend`, fields in `Field` with `data-invalid`/`aria-invalid` and `FieldError`, icons via `InputGroup`. Typed signature uses `SignatureFields`.
- **Layout containment:** keep `min-w-0` on flex ancestors of a wide table so the page never scrolls sideways (see `(app)/layout.tsx`, `EntityContainer`, `DataTable`).
- If a list page needs something this pattern lacks, extend the shared component (`DataTable`, entity components) instead of diverging in one feature.

## Calling backend APIs (TanStack Query + axios)

The backend is **this app's own Next.js route handlers (`src/app/api/**`) + Prisma + MySQL**. Auth is an httpOnly JWT cookie (`lib/session.ts`, `lib/jwt.ts`); the browser sends it automatically. Client-side API calls go through TanStack Query v5 + axios, layered per feature. Check the TanStack Query docs (Context7) for v5 API details before writing non-trivial usage.

**Server rules (every route handler):**

- Use `requireUser(roles?)` from `@/lib/auth`: `const auth = await requireUser(["ADMIN"]); if ("error" in auth) return auth.error;` (401 if signed out/disabled, 403 if the role is not allowed). It reads the user, role and company/branch access **from the DB**, never from the JWT, so role changes and disabling apply immediately.
- Scope data with `userScopeWhere(user)` (Prisma `where`: Admin all, Manager own team + branches, Agency owner own agency, Agent only self). UI role checks are display only.
- Validate bodies with zod (`features/<feature>/schemas.ts`) and return 400/401/403/409 with `{ error }`.
- Record create / role change / disable / export with `logAudit(...)` from `@/lib/audit`.
- Schema changes go through `bun run db:migrate` (never `db push`); seed dev data with `bun run db:seed`.
- There is no public sign-up; only an Admin creates users (Team page).

### Flow

```
app/**/page.tsx                                  thin page, renders a feature view
  -> features/<feature>/_components/*-view.tsx   UI; consumes hooks only
    -> features/<feature>/hooks/use-*.ts         TanStack hooks (queries, mutations, toasts)
      -> features/<feature>/api/index.ts         axios functions only
        -> lib/axios.ts                          shared axios instance
          -> /api route handlers -> Prisma -> MySQL
```

- Components never call axios directly and never show toasts — hooks own both.
- Request/response types live in `features/<feature>/types.ts`.

### Setup (already in place)

- `components/providers/query-provider.tsx` — the `QueryClient` provider, mounted in `app/layout.tsx`.
- `lib/axios.ts` — shared instance `api` with `baseURL: "/api"`; paths passed to it are relative (`"/logs"`).
- `lib/get-error-message.ts` — `getErrorMessage(error, fallback)`; hooks use it for toasts — do not re-define it.
- Toasts: import `toast` from `@/components/ui/toast` and call `toast.add({ title, description, type })`.
- Pages in `(app)` fall back to `(app)/error.tsx` (shared `ErrorView` with retry); wrap views that read URL params in `<Suspense fallback={<LoadingView />}>`.

### API functions — `features/<feature>/api/index.ts`

- `const` + arrow, relative URLs, typed generics, return the unwrapped `data`.
- GET params go in `{ params }`; DELETE bodies go in `{ data }`.

```ts
// Fetches a page of run logs.
export const getLogs = async ({ page, pageSize }: { page: number; pageSize: number }) => {
  const { data } = await api.get<LogsResponse>("/logs", { params: { page, pageSize } });
  return data;
};
```

### Query hooks — `features/<feature>/hooks/use-<x>.ts`

- Names: `useGet<Plural>` for lists, otherwise verb-first (`useAgentTools`). File extension is `.ts` unless the file contains JSX.
- Query keys are kebab-case arrays: `["get-logs", page, pageSize]`. Reuse the exact same key when invalidating; if a key is shared across features, export it from a constants file.
- Use `enabled` for gated fetches, `placeholderData: keepPreviousData` for pagination, and an optional `options?: { refetchInterval?: number }` argument for opt-in polling.

```ts
// Paginated run logs; keeps the previous page visible while the next one loads.
export const useGetLogs = (page: number, pageSize: number, options?: { refetchInterval?: number }) =>
  useQuery({
    queryFn: () => getLogs({ page, pageSize }),
    queryKey: ["get-logs", page, pageSize],
    placeholderData: keepPreviousData,
    refetchInterval: options?.refetchInterval,
  });
```

### Mutation hooks

Every mutation has `mutationFn`, `mutationKey` (kebab-case verb phrase), `onSuccess` (invalidate the owning query key + success toast) and `onError` (error toast using `getErrorMessage`). No optimistic updates unless explicitly requested.

```ts
// Deletes an agent, then refreshes the agents list.
export const useDeleteAgent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgent,
    mutationKey: ["delete-agent"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agents"] });
      toast.add({ title: "Agent deleted", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't delete agent", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
};
```

- Components pass per-call callbacks only for UI follow-up: `mutate(vars, { onSuccess: () => onOpenChange(false) })`.
- Extra variables used only for the toast (e.g. `agentName`) may ride along in the mutation variables; note that in a comment.
- Per-item pending state: `mutation.isPending && mutation.variables?.id === item.id`.

### Calling hooks in a component

Destructure only what the UI needs from the hook, and rename `data` to something meaningful when it helps.

**Query (read data):**

```tsx
"use client";

// Lists agents: pending -> error -> empty -> data.
export const AgentsView = () => {
  const { data, isPending, isError, error, refetch } = useGetAgents();

  if (isPending) return <Spinner />;
  if (isError) return <p>{getErrorMessage(error, "Couldn't load agents.")}</p>; // add a retry button calling refetch()
  if (!data.length) return <Empty />;

  return data.map((agent) => <AgentCard key={agent.id} agent={agent} />);
};
```

- Hooks that take arguments: `useGetLogs(page, pageSize)`; opt-in polling: `useGetLogs(page, pageSize, { refetchInterval: 5000 })`.
- Pagination: `isPlaceholderData` (from `placeholderData: keepPreviousData`) tells you the previous page is still showing; use `isFetching` for a subtle refresh indicator, not `isPending`.
- Gated queries (`enabled: !!id`) stay `isPending` while disabled — guard with `isPending && isFetching` or check the gate in the component if you need a different empty state.
- Never copy `data` into `useState` — read it straight from the hook.

**Mutation (write data):**

```tsx
"use client";

// Delete button: the hook owns the toast; the component only handles UI follow-up.
export const DeleteAgentButton = ({ id, onDone }: { id: string; onDone: () => void }) => {
  const { mutate, isPending } = useDeleteAgent();

  return (
    <Button
      variant="destructive"
      disabled={isPending}
      onClick={() => mutate({ id }, { onSuccess: onDone })}
    >
      {isPending ? <Spinner /> : null}
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
};
```

- Use `mutate` for fire-and-forget (with per-call `onSuccess`/`onError` only for UI follow-up); use `mutateAsync` only when you need to `await` the result inside a try/catch.
- A mutation's `isPending` is its own in-flight state; a query's `isPending` means "no data yet" — don't mix them up.
- Never `await` an API function or call `api` directly in a component; always go through the hook.

### Components

- Any component using hooks, state or TanStack Query needs `"use client"` at the top; keep `page.tsx` server components where possible.
- Render states in this order: `isPending` -> `isError` -> empty -> data. Use `isPending` consistently (not `isLoading`).
- Mutation buttons: `disabled={isPending}`, the `Spinner` from `components/ui/spinner`, and a label swap ("Saving…").
- Forms: validate with a zod schema in `features/<feature>/schemas.ts`; show errors through the shadcn `Field`/`FieldError` components.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->