import { NextResponse } from "next/server";
import { sendDailyCallerReports } from "@/lib/reports/daily-caller-email";
import { hasValidSecret } from "@/lib/secret";

// The morning email's trigger: an external scheduler calls this with header x-cron-secret = CRON_SECRET (no login, so the secret is the only
// protection; an empty / missing CRON_SECRET rejects everything). Emails each Admin and Manager the caller-wise report for their scope.
export const POST = async (req: Request) => {
  if (!hasValidSecret(req, "x-cron-secret", process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await sendDailyCallerReports());
};
