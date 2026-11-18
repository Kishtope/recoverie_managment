import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { batchScopeWhere, eligibleLoanWhere, loadBatchSummaries } from "@/lib/batches";
import { prisma } from "@/lib/prisma";
import { createBatchSchema } from "@/features/batches/schemas";
import { BATCH_STAGES, BATCH_TYPES, STAGE_STATUS, type BatchListResponse, type BatchStage } from "@/features/batches/types";
import { batchSelect, toBatchItem } from "./item";
import { MAX_CASES } from "./limits";

// Lists the batches the caller may see for one type (Call or FR) and stage (drafts / open / in progress / closed), with search by name and
// paging. Each row carries its money and follow-up counts; `counts` fills the stage tabs. Admin, Manager and Agency owner.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const type = (BATCH_TYPES as readonly string[]).includes(sp.get("type") ?? "") ? (sp.get("type") as (typeof BATCH_TYPES)[number]) : "CALL";
  const stage = (BATCH_STAGES as readonly string[]).includes(sp.get("stage") ?? "") ? (sp.get("stage") as BatchStage) : "open";
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const ofType: Prisma.BatchWhereInput = { AND: [batchScopeWhere(auth.user), { type }] };
  const where: Prisma.BatchWhereInput = { AND: [ofType, { status: STAGE_STATUS[stage] }, q ? { name: { contains: q } } : {}] };

  const [batches, total, grouped] = await Promise.all([
    prisma.batch.findMany({
      where,
      select: batchSelect,
      orderBy: [stage === "closed" ? { closedAt: "desc" } : { createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.batch.count({ where }),
    prisma.batch.groupBy({ by: ["status"], where: ofType, _count: { _all: true } }),
  ]);

  const summaries = await loadBatchSummaries(batches);
  const counts = Object.fromEntries(BATCH_STAGES.map((s) => [s, grouped.find((g) => g.status === STAGE_STATUS[s])?._count._all ?? 0])) as Record<BatchStage, number>;
  const body: BatchListResponse = { items: batches.map((b) => toBatchItem(b, summaries.get(b.id)!)), total, page, pageSize, counts };
  return NextResponse.json(body);
};

// Creates a Draft batch from the cases that match the chosen filters. Only active cases inside the caller's scope that are not already in an
// unfinished batch of the same type are taken; FR batches take only cases flagged for a field visit unless told otherwise. Admin and Manager.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const parsed = createBatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { name, type, company, branch, minDpd, flaggedOnly } = parsed.data;

  const loans = await prisma.loan.findMany({
    where: eligibleLoanWhere(auth.user, { type, company, branch, minDpd, flaggedOnly }),
    select: { id: true },
    take: MAX_CASES + 1,
  });
  if (loans.length === 0) return NextResponse.json({ error: "No cases match these filters" }, { status: 400 });
  if (loans.length > MAX_CASES) return NextResponse.json({ error: `Too many cases (more than ${MAX_CASES}). Narrow the filters.` }, { status: 400 });

  try {
    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.batch.create({ data: { name, type, createdById: auth.user.id }, select: batchSelect });
      await tx.batchLoan.createMany({ data: loans.map((l) => ({ batchId: created.id, loanId: l.id })) });
      return created;
    });
    await logAudit(auth.user.id, "batch.create", "Batch", batch.id, { name, type, cases: loans.length });
    const summaries = await loadBatchSummaries([batch]);
    return NextResponse.json({ batch: toBatchItem(batch, summaries.get(batch.id)!) }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return NextResponse.json({ error: "A batch with this name already exists" }, { status: 409 });
    throw e;
  }
};
