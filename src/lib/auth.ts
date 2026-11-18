import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/jwt";
import type { CurrentUser } from "@/lib/access";

export { callScopeWhere, loanScopeWhere, ownCaseWhere, userScopeWhere } from "@/lib/access";
export type { CurrentUser } from "@/lib/access";

// Reads the session cookie, then loads the user from the DB so role changes and disabling apply at once.
// Returns null for no/invalid cookie, a missing user or a DISABLED user.
export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true, name: true, email: true, role: true, status: true, agencyId: true,
      agency: { select: { id: true, name: true } },
      access: { select: { company: true, branch: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  const current: CurrentUser = { id: user.id, name: user.name, email: user.email, role: user.role, agencyId: user.agencyId, agency: user.agency, access: user.access };
  return current;
};

// For route handlers: returns { user } or { error } (a 401/403 response to return as is).
// Usage: const auth = await requireUser(["ADMIN"]); if ("error" in auth) return auth.error;
export const requireUser = async (roles?: Role[]) => {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "You don't have access to this" }, { status: 403 }) };
  }
  return { user };
};
