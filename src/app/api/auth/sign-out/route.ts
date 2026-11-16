import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/jwt";

// Ends the session by dropping the httpOnly access-token cookie.
export const POST = async () => {
  (await cookies()).delete(ACCESS_COOKIE);
  return NextResponse.json({ ok: true });
};
