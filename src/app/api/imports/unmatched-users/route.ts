import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ImportRowError, UnmatchedHubUser } from "@/features/imports/types";

// Hub users named in the last 5 allocation files that still have no app account, with how many rows each blocked. Admin only.
export const GET = async () => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const runs = await prisma.importRun.findMany({
    where: { type: "ALLOCATIONS", status: "DONE", failed: { gt: 0 } },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: { errors: true },
  });
  const rows = new Map<string, number>();
  for (const run of runs) {
    for (const e of (run.errors ?? []) as unknown as ImportRowError[]) {
      if (e.hubUserId) rows.set(e.hubUserId, (rows.get(e.hubUserId) ?? 0) + 1);
    }
  }
  // Drop ids an Admin has mapped since the import ran.
  const mapped = await prisma.user.findMany({ where: { hubUserId: { in: [...rows.keys()] } }, select: { hubUserId: true } });
  mapped.forEach((u) => rows.delete(u.hubUserId!));

  const items: UnmatchedHubUser[] = [...rows].map(([hubUserId, count]) => ({ hubUserId, rows: count })).sort((a, b) => b.rows - a.rows);
  return NextResponse.json({ items });
};
