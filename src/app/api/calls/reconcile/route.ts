import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { reconcileCalls } from "@/lib/telephony/reconcile";
import { reconcileSchema } from "@/features/calls/schemas";

// Admin: re-reads the provider's call report for one day and fills in missing or unfinished calls (also fails calls stuck ringing for hours).
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = reconcileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  try {
    const summary = await reconcileCalls(parsed.data.day);
    await logAudit(auth.user.id, "call.reconcile", "call", undefined, summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Call reconciliation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reconciliation failed" }, { status: 502 });
  }
};
