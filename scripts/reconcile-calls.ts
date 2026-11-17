import { todayIst } from "../src/lib/dates";
import { prisma } from "../src/lib/prisma";
import { reconcileCalls } from "../src/lib/telephony/reconcile";

// Reconciles one day of calls with the provider's report: `bun scripts/reconcile-calls.ts --day=2026-11-17` (default: today, Indian time).
// TODO(sarv): decide who runs this every night (server cron, Windows Task Scheduler or the hosting's scheduler).
const day = process.argv.find((a) => a.startsWith("--day="))?.slice(6) ?? todayIst();
reconcileCalls(day)
  .then((summary) => console.log(summary))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
