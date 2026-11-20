import { useUrlListParams, type FilterConfig } from "@/hooks/use-url-list-params";
import { QUESTION_CATEGORIES } from "@/lib/constants";
import { QUESTION_FILTERS } from "../types";

// Questions page state kept in the URL (?status=&category=&q=&page=); defaults (All, All categories) are never written.
const QUESTIONS_FILTERS: FilterConfig = {
  status: { default: "all", values: QUESTION_FILTERS },
  category: { default: "all", values: ["all", ...QUESTION_CATEGORIES] },
};

// Status, category, search and page of the Questions page. Changing any filter goes back to page 1.
export const useQuestionsParams = () => useUrlListParams(QUESTIONS_FILTERS);
