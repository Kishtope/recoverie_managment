import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { BATCH_TRANSITIONS, batchScopeWhere, loadBatchSummaries } from "@/lib/batches";
import { prisma } from "@/lib/prisma";
import { batchActionSchema } from "@/features/batches/schemas";
import type { BatchDetail } from "@/features/batches/types";
import { batchSelect, toBatchItem } from "../item";

// Most cases the detail sheet lists (the biggest by overdue amount); the real count comes back as `casesTotal`.
const CASE_LIMIT = 100;

// What each action does, in words, for the "wrong stage" message.
const ACTION_VERB = { open: "opened", start: "started", close: "closed" } as const;

// One batch the caller may see, with its numbers and its biggest cases. Admin, Manager and Agency owner.
export const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const batch = await prisma.batch.findFirst({ where: { AND: [{ id }, batchScopeWhere(auth.user)] }, select: batchSelect });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const [summaries, rows, casesTotal] = await Promise.all([
    loadBatchSummaries([batch]),
    prisma.batchLoan.findMany({
      where: { batchId: id },
      select: {
        loan: { select: { id: true, agreementNo: true, company: true, branch: true, dpd: true, overdueAmount: true, lastOutcome: true, customer: { select: { name: true } } } },
      },
      orderBy: [{ loan: { overdueAmount: { sort: "desc", nulls: "last" } } }, { loanId: "asc" }],
      take: CASE_LIMIT,
    }),
    prisma.batchLoan.count({ where: { batchId: id } }),
  ]);

  const detail: BatchDetail = {
    ...toBatchItem(batch, summaries.get(id)!),
    casesTotal,
    cases: rows.map(({ loan: l }) => ({
      id: l.id,
      agreementNo: l.agreementNo,
      customerName: l.customer.name,
      company: l.company,
      branch: l.branch,
      dpd: l.dpd,
      overdueAmount: l.overdueAmount?.toNumber() ?? null,
      lastOutcome: l.lastOutcome,
    })),
  };
  return NextResponse.json({ batch: detail });
};

// Moves a batch one step forward: open (Draft -> Open), start (Open -> In progress, optionally for an agency), close (In progress -> Closed).
// The status is part of the update's condition, so two people clicking at once cannot both win. Admin and Manager.
export const PATCH = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = batchActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { action } = parsed.data;
  const agencyId = parsed.data.agencyId || null;

  const batch = await prisma.batch.findFirst({ where: { AND: [{ id }, batchScopeWhere(auth.user)] }, select: { id: true, status: true } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const [from, to] = BATCH_TRANSITIONS[action];
  if (batch.status !== from) {
    return NextResponse.json({ error: `Only a ${from.toLowerCase().replace("_", " ")} batch can be ${ACTION_VERB[action]}` }, { status: 409 });
  }
  if (action === "start" && agencyId && !(await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Choose an agency from the list" }, { status: 400 });
  }

  const now = new Date();
  const { count } = await prisma.batch.updateMany({
    where: { id, status: from },
    data: { status: to, ...(action === "start" ? { agencyId, assignedOn: now } : {}), ...(action === "close" ? { closedAt: now } : {}) },
  });
  if (count === 0) return NextResponse.json({ error: "This batch was changed by someone else. Refresh and try again." }, { status: 409 });
  await logAudit(auth.user.id, `batch.${action}`, "Batch", id, action === "start" ? { agencyId } : undefined);

  const fresh = await prisma.batch.findUniqueOrThrow({ where: { id }, select: batchSelect });
  const summaries = await loadBatchSummaries([fresh]);
  return NextResponse.json({ batch: toBatchItem(fresh, summaries.get(id)!) });
};

// Deletes a Draft batch (its cases become free again); a batch that was opened can only be closed. Admin and Manager.
export const DELETE = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const batch = await prisma.batch.findFirst({ where: { AND: [{ id }, batchScopeWhere(auth.user)] }, select: { id: true, name: true, status: true } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status !== "DRAFT") return NextResponse.json({ error: "Only a draft batch can be deleted" }, { status: 409 });

  const { count } = await prisma.batch.deleteMany({ where: { id, status: "DRAFT" } });
  if (count === 0) return NextResponse.json({ error: "This batch was changed by someone else. Refresh and try again." }, { status: 409 });
  await logAudit(auth.user.id, "batch.delete", "Batch", id, { name: batch.name });
  return NextResponse.json({ ok: true });
};
