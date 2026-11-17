import { api } from "@/lib/axios";
import type {
  ImportKind,
  ImportListQuery,
  ImportListResponse,
  ImportRunDetail,
  ImportRunItem,
  UnmatchedHubUser,
} from "../types";

// Fetches one page of import runs; "all" filters are left out of the query.
export const getImports = async (query: ImportListQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== "" && v !== "all"));
  const { data } = await api.get<ImportListResponse>("/imports", { params });
  return data;
};

// Fetches one run with its full error list.
export const getImport = async (id: string) => {
  const { data } = await api.get<{ run: ImportRunDetail }>(`/imports/${id}`);
  return data.run;
};

// Uploads a Loans or Allocations file and returns the run summary.
export const uploadImport = async ({ type, file }: { type: ImportKind; file: File }) => {
  const form = new FormData();
  form.append("type", type);
  form.append("file", file);
  const { data } = await api.post<{ run: ImportRunItem }>("/imports", form);
  return data.run;
};

// Fetches hub users from recent allocation files that still have no app account.
export const getUnmatchedHubUsers = async () => {
  const { data } = await api.get<{ items: UnmatchedHubUser[] }>("/imports/unmatched-users");
  return data.items;
};
