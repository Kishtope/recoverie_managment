import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toRunItem } from "@/lib/imports/run";
import type { ImportRowError } from "@/features/imports/types";

// One import run with its full error list (row, agreement no., reason). Admin only.
export const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const run = await prisma.importRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "Import not found" }, { status: 404 });
  const by = await prisma.user.findUnique({ where: { id: run.createdById }, select: { id: true, name: true } });
  return NextResponse.json({ run: { ...toRunItem(run, by), errors: (run.errors ?? []) as unknown as ImportRowError[] } });
};
