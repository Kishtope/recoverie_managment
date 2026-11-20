import { api } from "@/lib/axios";
import type { QuestionInput, UpdateQuestionInput } from "../schemas";
import type { ActiveQuestion, QuestionItem, QuestionListQuery, QuestionListResponse } from "../types";

// Fetches one page of questions (Admin); "all" and empty filters are left out of the query.
export const getQuestions = async (query: QuestionListQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<QuestionListResponse>("/questions", { params });
  return data;
};

// Fetches the active questions an agent asks on a call.
export const getActiveQuestions = async () => {
  const { data } = await api.get<{ questions: ActiveQuestion[] }>("/questions/active");
  return data.questions;
};

// Creates a question (Admin).
export const createQuestion = async (body: QuestionInput) => {
  const { data } = await api.post<{ question: QuestionItem }>("/questions", body);
  return data.question;
};

// Edits a question or switches it active / inactive (Admin); `id` is the path, the rest is the body.
export const updateQuestion = async ({ id, ...body }: UpdateQuestionInput & { id: string }) => {
  const { data } = await api.patch<{ question: QuestionItem }>(`/questions/${id}`, body);
  return data.question;
};

// Deletes a question (Admin).
export const deleteQuestion = async (id: string) => {
  const { data } = await api.delete<{ ok: true }>(`/questions/${id}`);
  return data;
};
