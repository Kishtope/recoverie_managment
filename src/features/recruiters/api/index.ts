import { api } from "@/lib/axios";
import type { AssignCasesInput } from "../schemas";
import type {
  AssignCasesResult,
  EscalationsQuery,
  EscalationsResponse,
  RecruiterCasesQuery,
  RecruiterCasesResponse,
  RecruiterOptions,
  RecruiterPerformanceResponse,
} from "../types";

// Drops empty and "all" filters so they never reach the server.
const clean = (query: Record<string, string | number>) => Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));

// Fetches one page of the cases recruiters hold, most urgent first.
export const getRecruiterCases = async (query: RecruiterCasesQuery) => {
  const { data } = await api.get<RecruiterCasesResponse>("/recruiters/cases", { params: clean(query) });
  return data;
};

// Fetches one page of cases that moved from a recruiter to a caller.
export const getRecruiterEscalations = async (query: EscalationsQuery) => {
  const { data } = await api.get<EscalationsResponse>("/recruiters/escalations", { params: clean(query) });
  return data;
};

// Fetches every recruiter's numbers for a period.
export const getRecruiterPerformance = async (period: string) => {
  const { data } = await api.get<RecruiterPerformanceResponse>("/recruiters/performance", { params: { period } });
  return data;
};

// Hands a recruiter cases nobody holds yet.
export const assignCases = async (input: AssignCasesInput) => {
  const { data } = await api.post<AssignCasesResult>("/recruiters/assign", input);
  return data;
};

// Fetches the recruiter filter choices and the escalation rules in force.
export const getRecruiterOptions = async () => {
  const { data } = await api.get<RecruiterOptions>("/recruiters/options");
  return data;
};
