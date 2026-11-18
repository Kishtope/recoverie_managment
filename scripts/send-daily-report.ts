import { prisma } from "../src/lib/prisma";
import { sendDailyCallerReports } from "../src/lib/reports/daily-caller-email";

// Emails the caller-wise report to every Admin and Manager: `bun scripts/send-daily-report.ts`. With no SMTP_HOST in .env the emails are
// printed to the console. TODO: decide who runs this every morning, or call POST /api/reports/daily-email with the x-cron-secret header instead.
sendDailyCallerReports()
  .then((summary) => console.log(summary))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
