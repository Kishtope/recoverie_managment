import { api } from "@/lib/axios";
import type { DispositionFormInput, ReassignInput } from "../schemas";
import type { DispositionResult, LoanDetailResponse, LoanListQuery, LoanListResponse } from "../types";

// Fetches one page of loans the caller may see; "all" filters are left out of the query.
export const getLoans = async (query: LoanListQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<LoanListResponse>("/loans", { params });
  return data;
};

// Fetches one case with its customer and outcome history.
export const getLoan = async (id: string) => {
  const { data } = await api.get<LoanDetailResponse>(`/loans/${id}`);
  return data.loan;
};

// Records an outcome on a case; `loanId` is the path, the rest is the body.
export const addDisposition = async ({ loanId, ...body }: DispositionFormInput & { loanId: string }) => {
  const { data } = await api.post<DispositionResult>(`/loans/${loanId}/dispositions`, body);
  return data;
};

// Moves a case to another agent (Manager / Agency owner / Admin).
export const reassignLoan = async ({ loanId, ...body }: ReassignInput & { loanId: string }) => {
  const { data } = await api.post<{ ok: true; agent: { id: string; name: string } }>(`/loans/${loanId}/reassign`, body);
  return data;
};
