import { api } from "@/lib/axios";
import type { ImportAutoAllocateInput } from "../schemas";
import type {
  ImportColumnsCheck,
  ImportKind,
  ImportPreview,
  ImportRunDetail,
  ImportUploadResult,
} from "../types";

// Fetches one run with its full error list.
export const getImport = async (id: string) => {
  const { data } = await api.get<{ run: ImportRunDetail }>(`/imports/${id}`);
  return data.run;
};

// Reads only the header row of a Customers file and lists the required columns it is missing.
export const checkImportColumns = async ({ file }: { file: File }) => {
  const form = new FormData();
  form.append("type", "LOANS");
  form.append("file", file);
  form.append("columns", "true");
  const { data } = await api.post<{ check: ImportColumnsCheck }>("/imports", form);
  return data.check;
};

// Checks a Customers file without saving anything: the counts, the retailer-wise split and the first rejected rows.
export const previewImport = async ({ file, company }: { file: File; company?: string }) => {
  const form = new FormData();
  form.append("type", "LOANS");
  form.append("file", file);
  form.append("preview", "true");
  if (company) form.append("company", company);
  const { data } = await api.post<{ preview: ImportPreview }>("/imports", form);
  return data.preview;
};

// Uploads a Customers file and returns the run summary (and the allocation result when `autoAllocate` was sent).
export const uploadImport = async ({ type = "LOANS", file, company, autoAllocate }: { type?: ImportKind; file: File; company?: string; autoAllocate?: ImportAutoAllocateInput }) => {
  const form = new FormData();
  form.append("type", type);
  form.append("file", file);
  if (company) form.append("company", company);
  if (autoAllocate) form.append("autoAllocate", JSON.stringify(autoAllocate));
  const { data } = await api.post<ImportUploadResult>("/imports", form);
  return data;
};

