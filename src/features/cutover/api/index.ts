import { api } from "@/lib/axios";
import type { CutoverQuery, CutoverResponse, StaffCheckResponse } from "../types";

// One page of users with their go-live readiness; "all" filters are left out of the query.
export const getCutover = async (query: CutoverQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<CutoverResponse>("/cutover/readiness", { params });
  return data;
};

// Downloads the readiness list as CSV for the chosen filter.
export const downloadCutoverCsv = async (filter: string) => {
  const res = await api.get<Blob>("/cutover/readiness", { params: { format: "csv", ...(filter !== "all" ? { filter } : {}) }, responseType: "blob" });
  return { blob: res.data, name: "cutover-readiness.csv" };
};

// Checks an old staff list (.xlsx / .csv) against the users in the app; nothing is saved.
export const checkStaff = async (file: File) => {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post<StaffCheckResponse>("/cutover/staff-check", body);
  return data;
};
