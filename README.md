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

Loans, customers, allocations and payments are loaded from Excel/CSV files on the **Imports** page (Admin only). Allocation files name each agent by their app email.

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

## Calling (mock until Sarv)

An agent calls from a case (**Call** button; with an alternate number a small menu offers Primary / Alternate). The server reads the real number from the database and hands it, with the agent's own mobile, to the telephony provider, so the browser only ever sees masked numbers. The agent's `User.mobile` is required (Team page). Calls start only between **9 AM and 7 PM IST** (button disabled, server answers 403). When a call is answered or missed the outcome form opens by itself (a missed call opens as "Not reachable"); **the next call is refused (409) until that outcome is saved**, and a banner reminds the agent. Customers' missed calls land in the allocated agent's **Follow-ups → Missed calls**. Every call is on the **Calls** page and in the case history (answered calls show a recording player; each play is audited).

All of this sits behind a provider interface in `src/lib/telephony/`. Until Sarv access exists only the **mock** provider runs:

| Env var | Meaning |
| --- | --- |
| `TELEPHONY_PROVIDER` | `mock` (default) or `sarv` |
| `TELEPHONY_WEBHOOK_SECRET` | secret the provider sends in header `x-telephony-secret` to `POST /api/telephony/webhook` (the only route without a login). Empty = the webhook rejects everything |
| `SARV_BASE_URL`, `SARV_API_KEY` | Sarv credentials (`// TODO(sarv)`) |

- **Simulate (dev only):** with the mock provider and outside production, a ringing call shows a dashed "Test call controls" box (Answered / Not answered / Failed). It sends the same normalized event a real webhook would, through `handleCallEvent`. Admin can fake a customer's missed call with `POST /api/dev/calls/simulate-inbound` (`{ "loanId": "..." }`). Both routes return 404 with `TELEPHONY_PROVIDER=sarv` or in production.
- **Webhook by hand:** `curl -X POST -H "x-telephony-secret: $TELEPHONY_WEBHOOK_SECRET" -d '{"providerCallId":"mock_x","direction":"INBOUND","status":"MISSED","customerNumber":"9800000001"}' <host>/api/telephony/webhook`
- **Reconciliation:** `bun scripts/reconcile-calls.ts --day=yyyy-MM-dd` (or Admin `POST /api/calls/reconcile`) re-reads the provider's report for a day and fails calls stuck ringing for 2+ hours.
- **Moving to Sarv:** fill the `TODO(sarv)` spots (`grep -rn "TODO(sarv)" src scripts`; the full list is in `docs/plan/phase-3-plan.md`), then set `TELEPHONY_PROVIDER=sarv`. The database, screens and rules do not change.

## Manager views and reports (Phase 4)

**Admin, Manager and Agency owner** land on a team **Dashboard** (filters: financial year, month, company, branch, agency, agent, DPD bucket; all in the URL). It shows cards, three charts (daily collection, outcomes, DPD buckets) and the user-wise table; **Recovery** is the same table with sorting, and **Performance** is the calling table. Everyone sees only their own scope (Admin all, Manager their team / branches, Agency owner their agency). Agents keep their own dashboard.

How the numbers are counted (period = the chosen FY or month, Indian calendar):

| Number | Rule |
| --- | --- |
| Allocated / due | loans with an active allocation; due = sum of their overdue amount |
| Paid, Part paid, PTP, Callback | the loan's **latest outcome inside the period** (a loan counts once) |
| Pending | no outcome in the period |
| Spoke to / Not spoken | spoke = at least one outcome that is not Not reachable / Wrong number; not spoken = only those two |
| Collected | sum of imported **Payments** in the period. Until a payments file covers the period it falls back to what agents reported in outcomes, and the card says so |
| Collection % | collected / due (empty when nothing is due) |
| PTP kept / broken / upcoming | kept = payments from the day it was made to promised day + **PTP grace days** reach the promised amount; broken = that window is over and they do not |
| Callback % | customer missed-calls that were called back / all customer missed-calls |

- **Payments import:** Imports page, type "Payments" (template `public/templates/payments.csv`: Agreement No, Amount, Paid On, Mode, Receipt No). A loan can have many rows. Re-uploading the same file adds nothing (dedupe on loan + day + amount + receipt no.); an unknown agreement no. is listed as an error row.
- **Settings (Admin):** calling window, not-reachable tries, PTP grace days and an optional monthly target %. Changes are audited; a missing row means the default (9 AM-7 PM, 3 tries, 0 days, no target).
- **Reassign:** on a case, Manager / Agency owner / Admin can move it to another active agent inside their scope. Refused while the current agent still owes the outcome of a call on that case. The old allocation is kept as history.
- **Notifications (the bell):** escalation (refused / dispute goes to the agent's manager or agency owner), reassigned cases, and each morning's due follow-ups and promises. The morning job is `bun scripts/generate-notifications.ts` (safe to run twice) or `POST /api/notifications/generate` with header `x-cron-secret: $CRON_SECRET` (an empty `CRON_SECRET` rejects everything). Someone still has to schedule it (Windows Task Scheduler or the host's scheduler).
- **Export Excel:** the dashboard and Recovery page download the **Daily MIS** (.xlsx: Summary, User-wise, Outcomes, DPD buckets, Team performance) for the filters on screen, built by the same functions as the dashboard. Each export is audited. The layout is ours until the real Daily MIS sample is available.

## Going live (Phase 5)

The full step-by-step is in [`docs/runbook.md`](docs/runbook.md) (environment variables, scheduled jobs, cut-over plan, rollback, training). In short:

- **Agent sign-in with a mobile code.** The sign-in page has an Email tab (everyone) and a Mobile code tab (agents only). The code is 6 digits, valid 5 minutes, one use, dead after 5 wrong tries; 60 seconds between codes and 5 codes per hour per mobile. The answer is the same for every mobile (real or not), so nobody can find out which numbers belong to agents. Only a hash is stored. `SMS_PROVIDER=mock` (default) sends nothing: the code is printed in the server log and, outside production, returned to the page as a test hint. A real vendor needs `TODO(sms)` filled in (`grep -rn "TODO(sms)" src`) and a DLT-registered template. Agents can still use email and password as a fallback.
- **Cut-over page (Admin).** `/cutover` lists every active user with what is missing before go-live (agents: mobile, hub user id, a first sign-in; others: email, a first sign-in), a Not ready filter and a CSV export (mobiles masked). Below it you can upload the old site's staff list (.xlsx / .csv, Name column, optional Mobile and Role) to see who already has an account, who needs one, who is disabled and who is ambiguous. Nothing is saved.
- **Backups.** `bun scripts/backup-db.ts` writes `backups/recoverie-yyyyMMdd-HHmmss.sql.gz` using `mysqldump` (set `MYSQLDUMP_PATH` if it is not on PATH) and deletes its own backups older than `BACKUP_KEEP_DAYS` (default 14). Someone has to schedule it and copy the files to a second place.
- **Health.** `GET /api/health` answers `ok` (200) or `degraded` (503) depending on whether the database can be reached; no login needed, no details exposed.
- **Install app.** Signed-in users see "Install app" in the sidebar when the browser can install it (on iPhone it explains Share, then Add to Home Screen). There is no offline mode.

## Retailers (Phase 6)

- **Retailers page (Admin).** `/retailers` has an Overview tab (retailers, customers held, customers without a retailer, outstanding, collected for this month / last month / all time, and a per-retailer table) and a Retailers tab to add, edit, activate and deactivate retailers. A retailer's page lists its customers with the caller who holds each loan. Retailers are never deleted; an inactive one keeps its customers but gets no new ones.
- **Upload mapping.** The customers file has an **Assignment Type** column (Caller or Retailer) and, for Retailer rows, a **Retailer Code**. The code in the file decides the retailer; nothing is ever balanced or moved automatically. A retailer takes at most **20 customers from one file**: the first 20 rows in file order are saved and the rest are rejected with a capacity error. Unknown, blank or inactive codes are rejected per row. Caller rows follow the normal caller workflow (auto-allocate only ever uses Caller rows).
- **Check, then upload.** The upload dialog has one button, **Check and upload**. It checks the file first (nothing is saved yet). If every row is valid it uploads right away; if some rows are invalid it stops and shows valid and invalid rows, the caller / retailer split, customers per retailer (out of 20) and the first errors, and the same button then uploads the valid rows. Each retailer customer records the upload (import run) that gave it to the retailer.
- **Retailer and caller are separate.** Changing one never changes the other. Admins can filter the Cases page by retailer and see it as a column.
- **Dev data.** `bun run db:seed` adds three retailers (RT-001, RT-002 active, RT-003 inactive).

## Scripts

- `bun run lint`, `bunx tsc --noEmit`, `bun test` (runs with `--isolate`: each test file gets its own module mocks)

Public sign-up is closed: an Admin creates users on the Team page. Plans live in `docs/plan/`.
