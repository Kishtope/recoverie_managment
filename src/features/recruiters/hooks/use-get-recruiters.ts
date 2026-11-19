import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRecruiterCases, getRecruiterEscalations, getRecruiterOptions, getRecruiterPerformance } from "../api";
import type { EscalationsQuery, RecruiterCasesQuery } from "../types";

// Paginated cases recruiters hold; keeps the previous page visible while the next one loads.
export const useGetRecruiterCases = (query: RecruiterCasesQuery) =>
  useQuery({
    queryFn: () => getRecruiterCases(query),
    queryKey: ["get-recruiter-cases", query],
    placeholderData: keepPreviousData,
  });

// Paginated cases that moved from a recruiter to a caller; fetched only while the Escalations tab is open.
export const useGetRecruiterEscalations = (query: EscalationsQuery, enabled: boolean) =>
  useQuery({
    queryFn: () => getRecruiterEscalations(query),
    queryKey: ["get-recruiter-escalations", query],
    placeholderData: keepPreviousData,
    enabled,
  });

// Every recruiter's numbers for a period; fetched only while the Performance tab is open.
export const useGetRecruiterPerformance = (period: string, enabled: boolean) =>
  useQuery({
    queryFn: () => getRecruiterPerformance(period),
    queryKey: ["get-recruiter-performance", period],
    placeholderData: keepPreviousData,
    enabled,
  });

// Recruiter dropdown choices and the escalation rules (shared by all tabs, rarely changes).
export const useGetRecruiterOptions = () =>
  useQuery({
    queryFn: getRecruiterOptions,
    queryKey: ["get-recruiter-options"],
    staleTime: 60_000,
  });
