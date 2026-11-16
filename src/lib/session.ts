import { cookies } from "next/headers";
import { ACCESS_COOKIE, signAccessToken } from "@/lib/jwt";

const TTL = 60 * 60 * 24 * 7; // 7 days

// Signs a token for the user and stores it in an httpOnly cookie (the only place the token is written).
export const startSession = async (user: { id: string; role: string }) => {
  const store = await cookies();
  store.set(ACCESS_COOKIE, signAccessToken({ sub: user.id, role: user.role }, TTL), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL,
  });
};
