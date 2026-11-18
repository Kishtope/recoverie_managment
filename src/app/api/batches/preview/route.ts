import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { eligibleLoanWhere } from "@/lib/batches";
import { prisma } from "@/lib/prisma";
import { createBatchSchema } from "@/features/batches/schemas";
import type { BatchPreview } from "@/features/batches/types";
import { MAX_CASES } from "../limits";

// How many cases a new batch would take for the chosen filters, so the form can show it before anything is created. Uses the same rule as
// creating (lib/batches.ts eligibleLoanWhere). Admin and Manager.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const minDpd = sp.get("minDpd");
  const parsed = createBatchSchema.omit({ name: true }).safeParse({
    type: sp.get("type") ?? undefined,
    company: sp.get("company") || undefined,
    branch: sp.get("branch") || undefined,
    minDpd: minDpd === null || minDpd === "" ? undefined : Number(minDpd),
    flaggedOnly: sp.get("flaggedOnly") === null ? undefined : sp.get("flaggedOnly") === "true",
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const count = await prisma.loan.count({ where: eligibleLoanWhere(auth.user, parsed.data) });
  return NextResponse.json({ count, max: MAX_CASES } satisfies BatchPreview);
};
