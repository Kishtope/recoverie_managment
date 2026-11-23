import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActiveQuestion } from "@/features/questions/types";

// The questions agents ask on a call: only active ones, ordered by category then display order. Read-only; agents cannot change them.
export const GET = async () => {
  const auth = await requireUser(["AGENT", "CALLER"]);
  if ("error" in auth) return auth.error;

  const rows = await prisma.customerQuestion.findMany({
    where: { active: true },
    select: { id: true, text: true, category: true },
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
  });
  const questions: ActiveQuestion[] = rows;
  return NextResponse.json({ questions });
};
