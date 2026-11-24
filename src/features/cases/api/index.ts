import { api } from "@/lib/axios";
import { fetchFile } from "@/lib/download-file";
import type { AutoAllocateInput, BulkReassignInput, ComplianceInput, DispositionFormInput, ReassignInput } from "../schemas";
import type { AutoAllocateResult, BulkReassignResult, DispositionResult, LoanDetailResponse, LoanListQuery, LoanListResponse } from "../types";

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

// Resolves a dispute or sets / clears do-not-call on a case's customer (Manager / Agency owner / Admin).
export const updateCompliance = async ({ loanId, ...body }: ComplianceInput & { loanId: string }) => {
  const { data } = await api.post<{ ok: true }>(`/loans/${loanId}/compliance`, body);
  return data;
};

// Moves several selected cases to one agent (Manager / Agency owner / Admin).
export const bulkReassignLoans = async (body: BulkReassignInput) => {
  const { data } = await api.post<BulkReassignResult>("/loans/bulk-reassign", body);
  return data;
};

// Previews (dryRun) or runs the allocation engine over the unassigned cases (Manager / Admin).
export const autoAllocate = async (body: AutoAllocateInput) => {
  const { data } = await api.post<AutoAllocateResult>("/allocation/auto", body);
  return data;
};

// Downloads an Excel file of every case matching the filters (the paging fields are dropped; the server exports all matches).
export const downloadCases = (query: Omit<LoanListQuery, "page" | "pageSize">) => fetchFile("/loans/export", query, "cases.xlsx");
