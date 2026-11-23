import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Agencies and possible "reports to" users for the Team form (Admin only).
export const GET = async () => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const [agencies, managers, agents] = await Promise.all([
    prisma.agency.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["ADMIN", "MANAGER", "AGENCY_OWNER"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    // Users who can hold cases; used by the Cases filter.
    prisma.user.findMany({
      where: { role: { in: ["AGENT", "CALLER", "AGENCY_OWNER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return NextResponse.json({ agencies, managers, agents });
};
