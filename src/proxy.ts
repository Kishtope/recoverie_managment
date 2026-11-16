import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/jwt";

// Pages reachable without a session; everything else requires a valid access token.
const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

// Gates pages on the JWT cookie: guests go to /sign-in, signed-in users are kept off the auth pages.
export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const signedIn = !!token && !!verifyAccessToken(token);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!signedIn && !isPublic) {
    const res = NextResponse.redirect(new URL("/sign-in", request.url));
    if (token) res.cookies.delete(ACCESS_COOKIE); // drop an expired/forged token
    return res;
  }
  if (signedIn && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
};

// Skip API routes (they authorize themselves), Next internals and public files like /brand/*.svg.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
