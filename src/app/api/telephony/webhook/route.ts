import { NextResponse } from "next/server";
import { hasValidSecret } from "@/lib/secret";
import { handleCallEvent } from "@/lib/telephony/handle-call-event";
import { getTelephonyProvider } from "@/lib/telephony";

// The only unauthenticated route; protected by TELEPHONY_WEBHOOK_SECRET (header x-telephony-secret).
// The provider calls this with call events. It answers 200 quickly even if one event is bad, so the provider doesn't retry forever.
// TODO(sarv): replace the shared-secret check with whatever Sarv offers (signature header, IP allow-list).
export const POST = async (req: Request) => {
  if (!hasValidSecret(req, "x-telephony-secret", process.env.TELEPHONY_WEBHOOK_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getTelephonyProvider();
  let events;
  try {
    events = await provider.parseWebhook(req);
  } catch (error) {
    console.error("Telephony webhook: could not read the payload", error);
    return NextResponse.json({ received: 0, error: "Unreadable payload" });
  }

  let processed = 0;
  for (const event of events) {
    try {
      await handleCallEvent(event, undefined, provider.name);
      processed += 1;
    } catch (error) {
      console.error("Telephony webhook: event failed", event.providerCallId, error);
    }
  }
  return NextResponse.json({ received: events.length, processed });
};
