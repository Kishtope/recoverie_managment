import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RetailerListResponse } from "@/features/retailers/types";
import { retailerSelect, toRetailerItem } from "./item";

// Lists retailers with a status filter (all / active / inactive), search by code, name, owner, city or mobile, and paging. Each row carries its
// customer count; `counts` fills the status toggle. Admin only. Retailers are loaded into the database beforehand, not created in the app, so there is no POST.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") === "active" ? "ACTIVE" : sp.get("status") === "inactive" ? "INACTIVE" : null;
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const search: Prisma.RetailerWhereInput = q
    ? { OR: [{ code: { contains: q } }, { name: { contains: q } }, { ownerName: { contains: q } }, { city: { contains: q } }, { mobile: { contains: q } }] }
    : {};
  const where: Prisma.RetailerWhereInput = { AND: [search, status ? { status } : {}] };

  const [items, total, grouped] = await Promise.all([
    prisma.retailer.findMany({ where, select: retailerSelect, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.retailer.count({ where }),
    // Counts for the toggle follow the search but not the status filter.
    prisma.retailer.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
  ]);
  const active = grouped.find((g) => g.status === "ACTIVE")?._count._all ?? 0;
  const inactive = grouped.find((g) => g.status === "INACTIVE")?._count._all ?? 0;

  const body: RetailerListResponse = { items: items.map(toRetailerItem), total, page, pageSize, counts: { all: active + inactive, active, inactive } };
  return NextResponse.json(body);
};
