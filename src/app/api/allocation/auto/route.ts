import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { runAutoAllocation } from "@/lib/allocation-run";
import { autoAllocateSchema } from "@/features/cases/schemas";

// Allocation engine endpoint: splits the active, unassigned cases in the caller's scope between the chosen people by a rule.
// `dryRun` returns the same plan without saving. Admin and Manager only; the work itself lives in lib/allocation-run.ts.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const parsed = autoAllocateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const outcome = await runAutoAllocation({ user: auth.user, ...parsed.data });
  return outcome.ok ? NextResponse.json(outcome.result) : NextResponse.json({ error: outcome.error }, { status: 400 });
};
