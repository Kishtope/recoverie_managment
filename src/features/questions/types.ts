import type { QuestionCategoryCode } from "@/lib/constants";

// One question in the Admin list.
export type QuestionItem = {
  id: string;
  text: string;
  category: QuestionCategoryCode;
  displayOrder: number;
  active: boolean;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export const QUESTION_FILTERS = ["all", "active", "inactive"] as const;
export type QuestionFilter = (typeof QUESTION_FILTERS)[number];

export type QuestionListQuery = { status: string; category: string; q: string; page: number; pageSize: number };
export type QuestionListResponse = { items: QuestionItem[]; total: number; page: number; pageSize: number; counts: Record<QuestionFilter, number> };

// What an agent sees: an active question, in the order to ask it.
export type ActiveQuestion = { id: string; text: string; category: QuestionCategoryCode };
