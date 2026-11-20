import { z } from "zod";
import { QUESTION_CATEGORIES } from "@/lib/constants";

// Body of POST /api/questions: a new question for agents to ask. A missing display order puts it last in its category.
export const questionSchema = z.object({
  text: z.string().trim().min(3, "Write the question (at least 3 characters)").max(500, "Keep the question under 500 characters"),
  category: z.enum(QUESTION_CATEGORIES, { error: "Choose a category" }),
  displayOrder: z.number({ error: "Enter a number" }).int("Use a whole number").min(0, "Can't be negative").max(9999, "Use 9999 or less").optional(),
  active: z.boolean().optional(),
});
export type QuestionInput = z.input<typeof questionSchema>;

// Body of PATCH /api/questions/[id]: any of the fields above (activating / deactivating sends only `active`).
export const updateQuestionSchema = questionSchema.partial().refine((v) => Object.keys(v).length > 0, "Nothing to change");
export type UpdateQuestionInput = z.input<typeof updateQuestionSchema>;
