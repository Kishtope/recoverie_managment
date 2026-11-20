import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import type { RetailerCustomerItem, RetailerCustomersResponse } from "@/features/retailers/types";

// The customers one retailer holds, with search by name, agreement no. or mobile digits (4+) and paging. A customer's money is summed over their
// active loans, and the callers are whoever holds those loans right now (a separate relationship from the retailer). Mobile numbers are masked.
// Admin only.
export const GET = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  if (!(await prisma.retailer.findUnique({ where: { id }, select: { id: true } }))) return NextResponse.json({ error: "Retailer not found" }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const where: Prisma.CustomerWhereInput = {
    retailerId: id,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { loans: { some: { agreementNo: { contains: q } } } },
            ...(/^\d{4,}$/.test(q) ? [{ mobilePrimary: { contains: q } }, { mobileAlt: { contains: q } }] : []),
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        mobilePrimary: true,
        retailerAssignedOn: true,
        loans: {
          orderBy: { agreementNo: "asc" },
          select: { agreementNo: true, status: true, dpd: true, overdueAmount: true, allocations: { where: { active: true }, take: 1, select: { agent: { select: { name: true } } } } },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  const items: RetailerCustomerItem[] = customers.map((c) => {
    const active = c.loans.filter((l) => l.status === "ACTIVE");
    const dpds = active.map((l) => l.dpd).filter((d): d is number => d !== null);
    return {
      id: c.id,
      name: c.name,
      mobile: maskMobile(c.mobilePrimary),
      agreementNo: c.loans[0]?.agreementNo ?? "-",
      loanCount: c.loans.length,
      outstanding: active.reduce((sum, l) => sum + (l.overdueAmount?.toNumber() ?? 0), 0),
      maxDpd: dpds.length ? Math.max(...dpds) : null,
      status: active.length ? "ACTIVE" : "CLOSED",
      callers: [...new Set(active.flatMap((l) => l.allocations.map((a) => a.agent?.name)).filter((n): n is string => !!n))],
      assignedOn: c.retailerAssignedOn?.toISOString() ?? null,
    };
  });
  const body: RetailerCustomersResponse = { items, total, page, pageSize };
  return NextResponse.json(body);
};
