# Recovery follow-up app

Next.js 16 + Prisma 7 (MySQL) + TanStack Query. Package manager: bun.

## Setup

1. `bun install`
2. Create `.env` with:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — MySQL connection
   - `JWT_ACCESS_SECRET` — secret that signs the session JWT
   - `SEED_USER_NAME`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` — the first Admin created by the seed
3. `bun run db:migrate` (dev) or `bun run db:deploy` (production) — apply migrations
4. `bun run db:seed` — one user per role (admin, manager, agency owner, 3 agents) for dev/testing; all use `SEED_USER_PASSWORD`
5. `bun run dev` and open http://localhost:3000

## Importing hub data (Admin)

Loans, customers and allocations come from hub.kishtope.com as Excel/CSV files on the **Imports** page (Admin only).

1. **Map hub users first.** On the Team page, create each agent and set their **Hub user ID** (their ID on the hub). Allocation rows are matched to app users by this ID only.
2. **Import Loans, then Allocations.** Templates are on the Imports page (`public/templates/*.csv`); header names are matched loosely (see `src/lib/imports/columns.ts`, the one file to change when the hub export format is known).
   - Loans are upserted by `Agreement No`. A blank cell leaves the stored value alone; loans missing from the file are not touched.
   - Allocations: a new agent for a loan closes the old allocation (kept as history). A blank `Hub User ID` closes the allocation (case becomes unassigned). Only the rows in the file change; cases not in the file keep their allocation.
3. Every rejected row (unknown branch, bad date, hub user with no app account, ...) is listed with its reason on the run's detail dialog, and can be downloaded as CSV. Nothing is skipped silently.
4. Limits: `.xlsx` or `.csv`, 10 MB, 50,000 rows. The file itself is not stored (customer data); only counts and errors are.

## Agent flow (Phase 2)

An agent signs in to **Dashboard** (today's / overdue follow-ups, PTPs due today, collected this month), opens **My cases** (next follow-up first), opens a case and records an **outcome**. **Follow-ups** shows the same cases as Overdue / Today / Next 7 days. Mobile numbers are masked everywhere; Manager, Agency owner and Admin can read cases but only the allocated agent can add an outcome. Outcomes are never edited or deleted.

| Outcome | Required | Effect on the case |
| --- | --- | --- |
| Paid | amount paid | follow-up ends; field-visit and escalation flags clear |
| Part paid | amount paid, next follow-up | follow-up on the chosen date |
| Promise to pay | promised date + amount | follow-up on the promised date |
| Callback | next follow-up | follow-up on the chosen date |
| Not reachable | nothing (tomorrow is pre-filled) | 3 in a row flag a field visit |
| Wrong number | remarks | follow-up ends |
| Refused / dispute | remarks | follow-up ends; escalated (managers see it via the Escalated filter) |

"Collected" on the dashboard is what agents reported in outcomes, not bank data; the Phase 4 payments import will replace it. "Today" is always the Indian calendar day. `bun run db:seed` adds sample outcomes (log in as `agent1@example.com`).

## Scripts

- `bun run lint`, `bunx tsc --noEmit`, `bun test`

Public sign-up is closed: an Admin creates users on the Team page. Plans live in `docs/plan/`.
