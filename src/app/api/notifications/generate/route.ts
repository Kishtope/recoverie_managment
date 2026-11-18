import { NextResponse } from "next/server";
import { generateDueNotifications } from "@/lib/notifications-job";
import { runRecruiterEscalation } from "@/lib/recruiter-escalation";
import { hasValidSecret } from "@/lib/secret";

// The morning job's trigger: an external scheduler calls this with header x-cron-secret = CRON_SECRET (no login, so the secret is the only
// protection; an empty / missing CRON_SECRET rejects everything). Escalates recruiter cases past their limit, sends the recruiter deadline reminders, then creates today's follow-up-due and PTP-due notifications, once each.
export const POST = async (req: Request) => {
  if (!hasValidSecret(req, "x-cron-secret", process.env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Escalate first so a case that just moved gets its due notification for the new owner.
  const recruiters = await runRecruiterEscalation();
  return NextResponse.json({ ...(await generateDueNotifications()), recruiters });
};
