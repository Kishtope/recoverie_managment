import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateQuestionSchema } from "@/features/questions/schemas";
import { questionSelect, toQuestionItem } from "../item";

// Edits a question or switches it active / inactive. Answers already saved keep the text they were asked with. Admin only.
export const PATCH = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = updateQuestionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid question" }, { status: 400 });

  const current = await prisma.customerQuestion.findUnique({ where: { id }, select: { id: true, active: true } });
  if (!current) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const updated = await prisma.customerQuestion.update({ where: { id }, data: parsed.data, select: questionSelect });
  const toggled = parsed.data.active !== undefined && parsed.data.active !== current.active;
  await logAudit(auth.user.id, toggled ? "question.status" : "question.update", "CustomerQuestion", id, toggled ? { active: parsed.data.active } : { fields: Object.keys(parsed.data) });
  return NextResponse.json({ question: toQuestionItem(updated) });
};

// Deletes a question. Saved interactions are untouched: they hold their own copy of the question text. Admin only.
export const DELETE = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const current = await prisma.customerQuestion.findUnique({ where: { id }, select: { id: true, category: true } });
  if (!current) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  await prisma.customerQuestion.delete({ where: { id } });
  await logAudit(auth.user.id, "question.delete", "CustomerQuestion", id, { category: current.category });
  return NextResponse.json({ ok: true });
};
