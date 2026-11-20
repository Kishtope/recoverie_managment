import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getActiveQuestions, getQuestions } from "../api";
import type { QuestionListQuery } from "../types";

// Paginated questions for the Admin list; keeps the previous page visible while the next one loads.
export const useGetQuestions = (query: QuestionListQuery) =>
  useQuery({
    queryFn: () => getQuestions(query),
    queryKey: ["get-questions", query],
    placeholderData: keepPreviousData,
  });

// The active questions an agent asks on a call; they rarely change, so they stay fresh for a minute.
export const useGetActiveQuestions = (enabled = true) =>
  useQuery({
    queryFn: getActiveQuestions,
    queryKey: ["get-active-questions"],
    staleTime: 60_000,
    enabled,
  });
