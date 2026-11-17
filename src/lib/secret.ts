import { timingSafeEqual } from "node:crypto";

// True when the request carries `expected` in the given header. Compared in constant time; an unset or empty secret rejects everything
// (fail closed), so a missing env var can never leave a public route open.
export const hasValidSecret = (req: Request, headerName: string, expected: string | undefined) => {
  const given = req.headers.get(headerName);
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
