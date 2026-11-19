import { NextResponse } from "next/server";
import { generateDueNotifications } from "@/lib/notifications-job";
import { hasValidSecret } from "@/lib/secret";

// The morning job's trigger: an external scheduler calls this with header x-cron-secret = CRON_SECRET (no login, so the secret is the only
// protection; an empty / missing CRON_SECRET rejects everything). Creates today's follow-up-due and PTP-due notifications, once each.
export const POST = async (req: Request) => {
  if (!hasValidSecret(req, "x-cron-secret", process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await generateDueNotifications());
};
