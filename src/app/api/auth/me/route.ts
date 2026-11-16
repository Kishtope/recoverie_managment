import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/jwt";

// Returns the signed-in user (from the cookie's token) for the sidebar footer.
export const GET = async () => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};
