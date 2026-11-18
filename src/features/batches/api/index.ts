import { api } from "@/lib/axios";
import type { BatchActionInput, CreateBatchInput } from "../schemas";
import type { BatchDetail, BatchListItem, BatchListQuery, BatchListResponse, BatchOptions, BatchPreview } from "../types";

// Fetches one page of batches for a type and stage; empty filters are left out of the query.
export const getBatches = async (query: BatchListQuery) => {
  const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== ""));
  const { data } = await api.get<BatchListResponse>("/batches", { params });
  return data;
};

// Fetches one batch with its numbers and its biggest cases.
export const getBatch = async (id: string) => {
  const { data } = await api.get<{ batch: BatchDetail }>(`/batches/${id}`);
  return data.batch;
};

// Agencies a batch can be assigned to.
export const getBatchOptions = async () => {
  const { data } = await api.get<BatchOptions>("/batches/options");
  return data;
};

// Creates a Draft batch from the cases matching the filters.
export const createBatch = async (input: CreateBatchInput) => {
  const { data } = await api.post<{ batch: BatchListItem }>("/batches", input);
  return data.batch;
};

// Moves a batch one step forward (open / start / close); `id` is the path, the rest is the body.
export const updateBatch = async ({ id, ...body }: BatchActionInput & { id: string }) => {
  const { data } = await api.patch<{ batch: BatchListItem }>(`/batches/${id}`, body);
  return data.batch;
};

// Deletes a Draft batch.
export const deleteBatch = async (id: string) => {
  const { data } = await api.delete<{ ok: true }>(`/batches/${id}`);
  return data;
};

// Counts the cases a new batch would take for the filters (nothing is created); empty filters are left out of the query.
export const getBatchPreview = async (filters: Omit<CreateBatchInput, "name">) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && (v as unknown) !== ""));
  const { data } = await api.get<BatchPreview>("/batches/preview", { params });
  return data;
};
