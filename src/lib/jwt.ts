import { createHmac, timingSafeEqual } from "node:crypto";

// Name of the httpOnly cookie that carries the access token.
export const ACCESS_COOKIE = "accessToken";

export type AccessClaims = { sub: string; role: string; exp: number };

const b64 = (value: string | Buffer) => Buffer.from(value).toString("base64url");

// HMAC-SHA256 signature over "header.payload" using the server secret.
const sign = (data: string) => createHmac("sha256", process.env.JWT_ACCESS_SECRET!).update(data).digest("base64url");

// Creates a signed HS256 access token valid for `ttlSeconds`.
export const signAccessToken = (claims: Omit<AccessClaims, "exp">, ttlSeconds: number) => {
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${head}.${body}.${sign(`${head}.${body}`)}`;
};

// Returns the claims if the signature is valid and the token hasn't expired, otherwise null.
export const verifyAccessToken = (token: string): AccessClaims | null => {
  const [head, body, sig] = token.split(".");
  if (!head || !body || !sig) return null;
  const expected = Buffer.from(sign(`${head}.${body}`));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as AccessClaims;
  return claims.exp > Date.now() / 1000 ? claims : null;
};
