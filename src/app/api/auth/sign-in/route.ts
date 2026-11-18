import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { startSession } from "@/lib/session";
import { signInSchema } from "@/features/auth/schemas";

// Verifies credentials, starts a session and returns the public user.
export const POST = async (req: Request) => {
  const parsed = signInSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email, wrong password and disabled accounts so accounts can't be enumerated.
  if (!user || user.status !== "ACTIVE" || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  // Device log: where and with what each sign-in came from.
  await logAudit(user.id, "auth.login", "User", user.id, {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
  });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};
