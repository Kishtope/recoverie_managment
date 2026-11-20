import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { addDays, monthStart, todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { RETAILER_PERIODS, type RetailerDashboardResponse, type RetailerPeriod } from "@/features/retailers/types";

// First and last day ("yyyy-MM-dd") of a period; `from` null = no start (all time).
const periodRange = (period: RetailerPeriod, today: string): { from: string | null; to: string } => {
  if (period === "all-time") return { from: null, to: today };
  const thisMonth = monthStart(today);
  if (period === "this-month") return { from: thisMonth, to: today };
  return { from: monthStart(addDays(thisMonth, -1)), to: addDays(thisMonth, -1) };
};

// A SUM() from a raw query (Decimal, string or number depending on the driver) as a plain number.
const num = (v: unknown) => Number(String(v ?? 0));

// Overview numbers: retailer counts, customers held, outstanding (overdue amount on those customers' active loans) and collected (payments on
// their loans in the chosen period: this month / last month / all time), in total and per retailer. Admin only.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const raw = new URL(req.url).searchParams.get("period") ?? "";
  const period = (RETAILER_PERIODS as readonly string[]).includes(raw) ? (raw as RetailerPeriod) : "this-month";
  const { from, to } = periodRange(period, todayIst());

  const [retailers, held, unassignedCustomers, outstandingRows, collectedRows] = await Promise.all([
    prisma.retailer.findMany({ select: { id: true, code: true, name: true, status: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.customer.groupBy({ by: ["retailerId"], where: { retailerId: { not: null } }, _count: { _all: true } }),
    prisma.customer.count({ where: { retailerId: null, loans: { some: {} } } }),
    prisma.$queryRaw<{ retailerId: string; total: unknown }[]>(Prisma.sql`
      SELECT c.retailerId AS retailerId, COALESCE(SUM(l.overdueAmount), 0) AS total
      FROM Loan l JOIN Customer c ON c.id = l.customerId
      WHERE c.retailerId IS NOT NULL AND l.status = 'ACTIVE'
      GROUP BY c.retailerId`),
    prisma.$queryRaw<{ retailerId: string; total: unknown }[]>(Prisma.sql`
      SELECT c.retailerId AS retailerId, COALESCE(SUM(p.amount), 0) AS total
      FROM Payment p JOIN Loan l ON l.id = p.loanId JOIN Customer c ON c.id = l.customerId
      WHERE c.retailerId IS NOT NULL AND p.paidOn <= ${to} ${from ? Prisma.sql`AND p.paidOn >= ${from}` : Prisma.empty}
      GROUP BY c.retailerId`),
  ]);

  const customersBy = new Map(held.map((h) => [h.retailerId, h._count._all]));
  const outstandingBy = new Map(outstandingRows.map((r) => [r.retailerId, num(r.total)]));
  const collectedBy = new Map(collectedRows.map((r) => [r.retailerId, num(r.total)]));

  const items = retailers.map((r) => ({
    retailerId: r.id,
    code: r.code,
    name: r.name,
    status: r.status,
    customers: customersBy.get(r.id) ?? 0,
    outstanding: outstandingBy.get(r.id) ?? 0,
    collected: collectedBy.get(r.id) ?? 0,
  }));
  const sum = (pick: (i: (typeof items)[number]) => number) => items.reduce((total, i) => total + pick(i), 0);
  const active = retailers.filter((r) => r.status === "ACTIVE").length;

  const body: RetailerDashboardResponse = {
    totals: {
      retailers: retailers.length,
      active,
      inactive: retailers.length - active,
      customers: sum((i) => i.customers),
      unassignedCustomers,
      outstanding: sum((i) => i.outstanding),
      collected: sum((i) => i.collected),
    },
    items,
    from,
    to,
  };
  return NextResponse.json(body);
};
