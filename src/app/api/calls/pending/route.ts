import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findPendingCall } from "@/lib/telephony/pending";
import type { PendingCall } from "@/features/calls/types";

// The agent's call that still needs an outcome (or null), for the banner on every page.
export const GET = async () => {
  const auth = await requireUser(["AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;

  const c = await findPendingCall(prisma, auth.user.id);
  const call: PendingCall | null =
    c && c.loanId
      ? { id: c.id, loanId: c.loanId, customerName: c.loan?.customer.name ?? "the customer", status: c.status, startedAt: c.startedAt.toISOString() }
      : null;
  return NextResponse.json({ call });
};
