import { api } from "@/lib/axios";
import type { ImportAutoAllocateInput } from "../schemas";
import type {
  ImportKind,
  ImportRunDetail,
  ImportUploadResult,
} from "../types";

// Fetches one run with its full error list.
export const getImport = async (id: string) => {
  const { data } = await api.get<{ run: ImportRunDetail }>(`/imports/${id}`);
  return data.run;
};

// Uploads a Customers file and returns the run summary (and the allocation result when `autoAllocate` was sent).
export const uploadImport = async ({ type = "LOANS", file, autoAllocate }: { type?: ImportKind; file: File; autoAllocate?: ImportAutoAllocateInput }) => {
  const form = new FormData();
  form.append("type", type);
  form.append("file", file);
  if (autoAllocate) form.append("autoAllocate", JSON.stringify(autoAllocate));
  const { data } = await api.post<ImportUploadResult>("/imports", form);
  return data;
};

