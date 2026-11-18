import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { checkAttempt } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { startSession } from "@/lib/session";
import { otpVerifySchema } from "@/features/auth/schemas";

// One answer for every way a code can be wrong (never asked for, wrong, expired, used, too many tries, not an agent), so the response
// tells an attacker nothing about the mobile or the code.
const invalid = () => NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });

// Signs an agent in with the code sent to their mobile. Only the newest code for the mobile counts; 5 wrong guesses kill it; a right code
// works once. Only ACTIVE agents can sign in this way (other roles use email and password).
export const POST = async (req: Request) => {
  const parsed = otpVerifySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { mobile, code } = parsed.data;
  const now = new Date();

  const record = await prisma.otpCode.findFirst({ where: { mobile }, orderBy: { createdAt: "desc" } });
  if (!record || !record.userId) return invalid();

  const result = checkAttempt(record, code, now);
  if (result === "invalid") {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return invalid();
  }
  if (result !== "ok") return invalid();

  // Consume it in one step so two requests with the same right code cannot both sign in.
  const used = await prisma.otpCode.updateMany({ where: { id: record.id, consumedAt: null }, data: { consumedAt: now } });
  if (used.count === 0) return invalid();

  const user = await prisma.user.findFirst({ where: { id: record.userId, role: { in: ["AGENT", "RECRUITER"] }, status: "ACTIVE" } });
  if (!user) return invalid();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
  await startSession(user);
  await logAudit(user.id, "auth.otp_login", "User", user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};
