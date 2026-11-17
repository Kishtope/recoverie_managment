import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { updateUserSchema } from "@/features/team/schemas";
import { userSelect } from "../select";

// Admin edits a user: details, role, access, reports-to, password, enable/disable. Role changes and disabling are audited.
export const PATCH = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = updateUserSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { password, access, mobile, agencyId, reportsToId, hubUserId, ...rest } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, status: true, hubUserId: true } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (id === auth.user.id && (rest.status === "DISABLED" || rest.role !== "ADMIN")) {
    return NextResponse.json({ error: "You cannot disable yourself or remove your own admin role" }, { status: 400 });
  }
  if (reportsToId === id) return NextResponse.json({ error: "A user cannot report to themselves" }, { status: 400 });

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        mobile: mobile || null,
        agencyId: agencyId || null,
        reportsToId: reportsToId || null,
        hubUserId: hubUserId || null,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        access: { deleteMany: {}, create: access },
      },
      select: userSelect,
    });
    if ((existing.hubUserId ?? null) !== (hubUserId || null)) await logAudit(auth.user.id, "user.hub_id_change", "User", id, { from: existing.hubUserId, to: hubUserId || null });
    if (existing.role !== rest.role) await logAudit(auth.user.id, "user.role_change", "User", id, { from: existing.role, to: rest.role });
    if (existing.status !== rest.status) {
      await logAudit(auth.user.id, rest.status === "DISABLED" ? "user.disable" : "user.enable", "User", id);
    }
    await logAudit(auth.user.id, "user.update", "User", id);
    return NextResponse.json({ user });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A user with this email, mobile or hub ID already exists" }, { status: 409 });
    }
    throw e;
  }
};
