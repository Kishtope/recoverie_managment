import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { devCallToolsEnabled } from "@/lib/telephony";
import { handleCallEvent } from "@/lib/telephony/handle-call-event";
import { simulateCallSchema } from "@/features/calls/schemas";

// Dev only: ends the agent's own ringing test call as answered / missed / failed by sending the same normalized event a real webhook would.
// Does not exist (404) unless the mock provider is on and the build is not production.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!devCallToolsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireUser(["AGENT", "CALLER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = simulateCallSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { result, durationSec } = parsed.data;

  const call = await prisma.call.findFirst({
    where: { id, agentId: auth.user.id, direction: "OUTBOUND", status: "INITIATED" },
    select: { id: true, providerCallId: true, startedAt: true },
  });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const now = new Date();
  const talk = result === "CONNECTED" ? (durationSec ?? 120) : undefined;
  await handleCallEvent({
    providerCallId: call.providerCallId ?? `mock_${call.id}`,
    callId: call.id,
    direction: "OUTBOUND",
    status: result,
    answeredAt: talk ? new Date(now.getTime() - talk * 1000).toISOString() : undefined,
    endedAt: now.toISOString(),
    durationSec: talk,
    failureReason: result === "FAILED" ? "Simulated failure" : undefined,
  });
  return NextResponse.json({ ok: true });
};
