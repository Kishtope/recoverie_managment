import { NextResponse } from "next/server";
import { requireUser, callScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { devCallToolsEnabled } from "@/lib/telephony";
import { callItemSelect, toCallItem } from "@/lib/telephony/serialize";

// One call's current state; the case page polls this every 2s while the call is still ringing. A call outside the caller's scope is a 404.
export const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "CALLER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const call = await prisma.call.findFirst({ where: { AND: [{ id }, callScopeWhere(auth.user)] }, select: callItemSelect });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  // The Simulate panel is offered only to the agent who placed the call, and only on the mock provider outside production.
  return NextResponse.json({ call: toCallItem(call), canSimulate: devCallToolsEnabled() && call.agent?.id === auth.user.id });
};
