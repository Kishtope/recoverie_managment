import { NextResponse } from "next/server";
import { requireUser, userScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Active users who can hold cases (agents and agency owners) inside the caller's user scope: Admin all, Manager their team and branches,
// Agency owner their agency. Feeds the agent filters and the Reassign dialog, so a Manager never sees people outside their scope.
export const GET = async () => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;

  const agents = await prisma.user.findMany({
    where: { AND: [userScopeWhere(auth.user), { status: "ACTIVE", role: { in: ["AGENT", "AGENCY_OWNER"] } }] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ agents });
};
