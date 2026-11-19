import { format } from "date-fns";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { summarizeReadiness, userReadiness } from "@/lib/cutover";
import { toCsv } from "@/lib/csv";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import { cutoverQuerySchema } from "@/features/cutover/schemas";
import type { CutoverResponse, CutoverUser } from "@/features/cutover/types";

// Which active users are ready for go-live (see lib/cutover.ts for the checks), with a summary, a Not ready filter and paging. Admin only.
// `?format=csv` downloads the whole filtered list (mobiles masked) and is written to the audit log.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const q = cutoverQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true, name: true, role: true, email: true, mobile: true, lastLoginAt: true,
      _count: { select: { allocations: { where: { active: true } } } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  const all = users.map((u) => ({ user: u, result: userReadiness(u) }));
  const rows = (q.filter === "not-ready" ? all.filter((x) => !x.result.ready) : all).map<CutoverUser>(({ user: u, result }) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    email: u.email,
    mobile: maskMobile(u.mobile),
    activeCases: u._count.allocations,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    ready: result.ready,
    problems: result.problems,
  }));

  if (q.format === "csv") {
    await logAudit(auth.user.id, "cutover.export", "cutover", undefined, { filter: q.filter, rows: rows.length });
    const header = ["Name", "Role", "Email", "Mobile", "Active cases", "Last sign-in", "Ready", "Problems"];
    const lines = rows.map((r) => [r.name, r.role, r.email, r.mobile, r.activeCases, r.lastLoginAt ? format(new Date(r.lastLoginAt), "yyyy-MM-dd HH:mm") : "Never", r.ready ? "Yes" : "No", r.problems.join("; ")]);
    return new Response(toCsv([header, ...lines]), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="cutover-readiness.csv"', "cache-control": "private, no-store" },
    });
  }

  const body: CutoverResponse = {
    summary: summarizeReadiness(all.map((x) => x.result)),
    items: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
    total: rows.length,
    page: q.page,
    pageSize: q.pageSize,
  };
  return NextResponse.json(body);
};
