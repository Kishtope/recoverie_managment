import { NextResponse } from "next/server";
import { requireUser, userScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { setTargetSchema } from "@/features/scorecards/schemas";

// Sets (or clears) a caller's monthly goals. Admin sets anyone's; a Manager only people in their own scope. Both values empty removes the
// target. Every change is audited.
export const PUT = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const parsed = setTargetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid target" }, { status: 400 });
  const { userId, month, collectionAmount, casesResolved } = parsed.data;

  const person = await prisma.user.findFirst({
    where: { AND: [userScopeWhere(auth.user), { id: userId, role: { in: ["AGENT", "AGENCY_OWNER", "RECRUITER"] } }] },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ error: "Choose a caller inside your team" }, { status: 400 });

  if (collectionAmount === null && casesResolved === null) {
    await prisma.agentTarget.deleteMany({ where: { userId, month } });
  } else {
    await prisma.agentTarget.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, collectionAmount, casesResolved, updatedById: auth.user.id },
      update: { collectionAmount, casesResolved, updatedById: auth.user.id },
    });
  }
  await logAudit(auth.user.id, "target.set", "User", userId, { month, collectionAmount, casesResolved });
  return NextResponse.json({ ok: true });
};
