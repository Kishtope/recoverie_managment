import { NextResponse } from "next/server";
import { canRequest, generateCode, hashCode, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { devSmsCodeVisible, getSmsProvider } from "@/lib/sms";
import { otpRequestSchema } from "@/features/auth/schemas";

// Sends a 6-digit login code to an agent's mobile. Public (it is how an agent signs in), so it must not reveal which mobiles are real:
// every valid-looking mobile gets the same answer and the same limits (a row is stored even when no agent owns the number), and the SMS
// only goes out when an ACTIVE agent owns it. Limits: 60 s between codes, 5 codes per hour per mobile.
export const POST = async (req: Request) => {
  const parsed = otpRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { mobile } = parsed.data;
  const now = new Date();

  // Housekeeping: codes older than a day are useless, so they are removed here instead of by a separate job.
  await prisma.otpCode.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 3600_000) } } });

  const history = await prisma.otpCode.findMany({ where: { mobile, createdAt: { gte: new Date(now.getTime() - 3600_000) } }, select: { createdAt: true } });
  const check = canRequest(history, now);
  if (!check.ok) {
    const error = check.reason === "cooldown" ? "Wait a minute before asking for another code." : "Too many codes requested. Try again later.";
    return NextResponse.json({ error, retryAfterSec: check.retryAfterSec }, { status: 429 });
  }

  const agent = await prisma.user.findFirst({ where: { mobile, role: { in: ["AGENT", "CALLER"] }, status: "ACTIVE" }, select: { id: true } });
  const code = generateCode();
  // An older code stops working the moment a new one is asked for.
  await prisma.otpCode.updateMany({ where: { mobile, consumedAt: null }, data: { consumedAt: now } });
  await prisma.otpCode.create({ data: { mobile, userId: agent?.id ?? null, codeHash: hashCode(code), expiresAt: new Date(now.getTime() + OTP_TTL_MS) } });

  if (agent) {
    try {
      await getSmsProvider().send({ to: mobile, text: `Your KishtoPe login code is ${code}. It is valid for 5 minutes. Do not share it.` });
    } catch (error) {
      console.error("OTP SMS failed", error);
      return NextResponse.json({ error: "Couldn't send the code. Try again in a minute." }, { status: 502 });
    }
  }
  // Test convenience only: with the mock provider outside production the code is returned so no phone is needed.
  return NextResponse.json({ sent: true, resendAfterSec: OTP_RESEND_COOLDOWN_MS / 1000, ...(agent && devSmsCodeVisible() ? { devCode: code } : {}) });
};
