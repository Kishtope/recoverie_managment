import { todayIst } from "../src/lib/dates";
import { generateDueNotifications } from "../src/lib/notifications-job";
import { prisma } from "../src/lib/prisma";

// Creates the day's follow-up-due / PTP-due notifications: `bun scripts/generate-notifications.ts --day=2026-11-17` (default: today, Indian time).
// Safe to run twice. TODO: decide who runs this every morning (Windows Task Scheduler or the hosting's scheduler), or call
// POST /api/notifications/generate with the x-cron-secret header instead.
const day = process.argv.find((a) => a.startsWith("--day="))?.slice(6) ?? todayIst();
generateDueNotifications(day)
  .then((summary) => console.log(summary))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
