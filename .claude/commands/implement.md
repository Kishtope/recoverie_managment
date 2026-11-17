---
description: Build one phase from a phase plan file (e.g. docs/plan/phase-0-plan.md), following CLAUDE.md, AGENTS.md and the project skills
argument-hint: <path to phase plan .md>
---

Implement the phase described in the plan file `$ARGUMENTS`.

If `$ARGUMENTS` is empty or the file does not exist, list the files in `docs/plan/` and ask me which one to use. Do not guess.

## 1. Read before writing any code

1. Read the whole plan file `$ARGUMENTS`. Its task list, order, file names, "Done" criteria and checklist are the scope. Do not build features from later phases.
2. Read `docs/plan/project-plan.md` for the overall context (data model, roles, phases).
3. Follow `CLAUDE.md` and `AGENTS.md` exactly: declaration style, comment style, project structure, reusability rules, list-page pattern, TanStack Query + axios layering, KishtoPe branding. Where `CLAUDE.md` and the actual code disagree (for example backend = Next.js route handlers + Prisma + MySQL), follow the code and the plan, and tell me about the mismatch.
4. This is Next.js 16: read the relevant guide in `node_modules/next/dist/docs/` before writing routes, layouts, the proxy or server code. Heed deprecation notices.
5. Look at the existing code each task touches (`src/`, `prisma/schema.prisma`) and reuse what is there before creating anything new.

## 2. Skills to load (with the Skill tool, before the matching work)

| Skill | Load before |
| --- | --- |
| `shadcn` | Any UI work: composing or adding primitives (`bunx shadcn add <name>`), forms, tables, dialogs. Never hand-edit or restyle `components/ui/` |
| `tanstack-query` | Writing query or mutation hooks, query keys, invalidation, pagination with `keepPreviousData` |
| `prisma-cli` | Changing `schema.prisma`, migrations (`bun run db:migrate`), generate, seed |
| `prisma-client-api` | Writing Prisma queries in route handlers or `lib/` (filters, `groupBy`, transactions) |
| `frontend-design:frontend-design` | Designing new screens or layouts. The KishtoPe brand in `public/brand.html` and the tokens in `src/app/globals.css` always win over this skill's general advice |

Only load a skill when the phase actually needs that kind of work.

## 3. Instructions to follow while building

1. Work through the plan's tasks **in the order given**. Before starting, post a short task list so I can follow progress.
2. Use **bun** for everything (`bun add`, `bun run`, `bunx`). If a task needs a package that is not in `package.json`, say so before installing it.
3. Database: change the schema only through Prisma migrations (`bun run db:migrate`), never `db push`. Before a migration that changes or deletes existing data, show me what it does and wait for my OK.
4. Every API route checks the session and role on the server (the plan's auth/access helper). UI role checks are for display only.
5. Validate every request body and form with zod (`features/<feature>/schemas.ts`); return clear 400/401/403/409 errors.
6. List pages follow the list-page pattern in `CLAUDE.md` (entity components, `DataTable`, filters in the URL, server-side pagination).
7. Components never call axios or show toasts; hooks do. Errors go through `getErrorMessage`.
8. Branding: use theme tokens only, no hex values; follow the radius, button, card and type rules in `CLAUDE.md`. Search `public/brand.html` in portions, never read it whole (~11.5MB).
9. Every new component, hook and function gets the comment style from `CLAUDE.md`.
10. Write the small tests the plan lists for risky logic (access rules, validation, URL params). Do not add tests for trivial code.
11. Do not commit or push unless I ask.
12. If a task is blocked by an open question in the plan (missing API, credentials, decision), skip it, note it, and keep going with the rest.

## 4. Check before saying done

1. Run `bun run lint` and `bunx tsc --noEmit`, and fix what you broke.
2. Run the tests you added.
3. Start the app (`bun run dev`) and check the main flow of the phase in the browser, for each role the plan mentions, where possible.
4. Go through the plan's checklist. In the plan file, tick the items that are really done (`- [x]`). Leave the others unticked.

## 5. Report

Reply with:

- What was built, task by task (one line each).
- Checklist items still open, and why.
- Anything skipped or blocked, mismatches you found between `CLAUDE.md` and the code, and any risk I need to know before the next phase.
