import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { QUESTION_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/features/questions/schemas";
import type { QuestionListResponse } from "@/features/questions/types";
import { questionSelect, toQuestionItem } from "./item";

// Lists the customer questions with a status filter (all / active / inactive), a category filter, search by text and paging, in the order
// agents see them (category, then display order). `counts` fills the status toggle. Admin only.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") === "active" ? true : sp.get("status") === "inactive" ? false : null;
  const category = QUESTION_CATEGORIES.find((c) => c === sp.get("category"));
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  // Counts for the toggle follow the search and category but not the status filter.
  const base: Prisma.CustomerQuestionWhereInput = { AND: [q ? { text: { contains: q } } : {}, category ? { category } : {}] };
  const where: Prisma.CustomerQuestionWhereInput = { AND: [base, status === null ? {} : { active: status }] };

  const [rows, total, grouped] = await Promise.all([
    prisma.customerQuestion.findMany({ where, select: questionSelect, orderBy: [{ category: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.customerQuestion.count({ where }),
    prisma.customerQuestion.groupBy({ by: ["active"], where: base, _count: { _all: true } }),
  ]);
  const active = grouped.find((g) => g.active)?._count._all ?? 0;
  const inactive = grouped.find((g) => !g.active)?._count._all ?? 0;

  const body: QuestionListResponse = { items: rows.map(toQuestionItem), total, page, pageSize, counts: { all: active + inactive, active, inactive } };
  return NextResponse.json(body);
};

// Creates a question. Without a display order it goes last in its category. Admin only.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = questionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid question" }, { status: 400 });
  const v = parsed.data;

  let displayOrder = v.displayOrder;
  if (displayOrder === undefined) {
    const last = await prisma.customerQuestion.aggregate({ where: { category: v.category }, _max: { displayOrder: true } });
    displayOrder = (last._max.displayOrder ?? 0) + 1;
  }
  const created = await prisma.customerQuestion.create({
    data: { text: v.text, category: v.category, displayOrder, active: v.active ?? true, createdById: auth.user.id },
    select: questionSelect,
  });
  await logAudit(auth.user.id, "question.create", "CustomerQuestion", created.id, { category: v.category });
  return NextResponse.json({ question: toQuestionItem(created) }, { status: 201 });
};
