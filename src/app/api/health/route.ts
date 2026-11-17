import { connection, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Is the app alive and can it reach its database? For the host, a load balancer or an uptime monitor; it needs no login, so it says nothing
// beyond ok / degraded (no version, path or error text). `connection()` makes it run on every request instead of being prerendered once.
export const GET = async () => {
  await connection();
  const time = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: true, time }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded", db: false, time }, { status: 503, headers: { "cache-control": "no-store" } });
  }
};
