import type { Prisma } from "@/generated/prisma/client";
import type { QuestionItem } from "@/features/questions/types";

// What the Admin list needs from a question, with the creator's name.
export const questionSelect = {
  id: true, text: true, category: true, displayOrder: true, active: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CustomerQuestionSelect;

// Shapes a question row for the API.
export const toQuestionItem = (q: Prisma.CustomerQuestionGetPayload<{ select: typeof questionSelect }>): QuestionItem => ({
  id: q.id, text: q.text, category: q.category, displayOrder: q.displayOrder, active: q.active, createdBy: q.createdBy,
  createdAt: q.createdAt.toISOString(), updatedAt: q.updatedAt.toISOString(),
});
