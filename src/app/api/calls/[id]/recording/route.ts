import { NextResponse } from "next/server";
import { requireUser, callScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

// Streams a call's recording to someone allowed to see the call. The provider's URL is never given to the browser: it is fetched here,
// so access is checked on every play and the play is audited. Mock calls have no recording (404).
export const GET = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const call = await prisma.call.findFirst({
    where: { AND: [{ id }, callScopeWhere(auth.user)] },
    select: { status: true, recordingUrl: true, provider: true },
  });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  if (call.status !== "CONNECTED" || !call.recordingUrl || call.provider === "MOCK") {
    return NextResponse.json({ error: "No recording" }, { status: 404 });
  }

  // A browser audio player asks for byte ranges while seeking; pass them through.
  const range = req.headers.get("range");
  // TODO(sarv): is the recording URL public, signed (expires) or does it need an auth header? Add the header here if so.
  const upstream = await fetch(call.recordingUrl, { headers: range ? { range } : {} }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) return NextResponse.json({ error: "Recording is not available right now" }, { status: 502 });

  // Only the first request of a play (no range, or from byte 0) is logged, so seeking doesn't flood the audit log.
  if (!range || range.startsWith("bytes=0-")) await logAudit(auth.user.id, "call.recording_play", "call", id);

  const headers = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", "private, no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
};
