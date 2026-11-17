import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markReadSchema } from "@/features/notifications/schemas";

// Marks the caller's own notifications read: the given ids, or every unread one when no ids are sent. Other people's ids are ignored.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"]);
  if ("error" in auth) return auth.error;

  const parsed = markReadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { count } = await prisma.notification.updateMany({
    where: { userId: auth.user.id, readAt: null, ...(parsed.data.ids ? { id: { in: parsed.data.ids } } : {}) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ marked: count });
};
