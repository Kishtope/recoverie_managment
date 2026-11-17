import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { requireUser, userScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { BRANCHES, ROLES } from "@/lib/constants";
import { createUserSchema } from "@/features/team/schemas";
import { userSelect } from "./select";

// Lists users the caller may see (Admin: all, Manager: team/branches, Agency owner: agency) with search, filters and paging.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const role = sp.get("role");
  const branch = sp.get("branch");
  const status = sp.get("status");
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const where: Prisma.UserWhereInput = {
    AND: [
      userScopeWhere(auth.user),
      q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { mobile: { contains: q } }] } : {},
      role && (ROLES as readonly string[]).includes(role) ? { role: role as (typeof ROLES)[number] } : {},
      status === "ACTIVE" || status === "DISABLED" ? { status } : {},
      branch && (BRANCHES as readonly string[]).includes(branch) ? { access: { some: { branch } } } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
};

// Admin creates a user (public sign-up is closed); logged in the audit log.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = createUserSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { password, access, mobile, agencyId, reportsToId, hubUserId, ...rest } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        ...rest,
        mobile: mobile || null,
        agencyId: agencyId || null,
        reportsToId: reportsToId || null,
        hubUserId: hubUserId || null,
        passwordHash: await hashPassword(password),
        access: { create: access },
      },
      select: userSelect,
    });
    await logAudit(auth.user.id, "user.create", "User", user.id, { role: user.role, email: user.email });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A user with this email, mobile or hub ID already exists" }, { status: 409 });
    }
    throw e;
  }
};
