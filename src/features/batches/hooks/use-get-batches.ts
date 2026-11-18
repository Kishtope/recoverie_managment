import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBatch, getBatchOptions, getBatchPreview, getBatches } from "../api";
import type { CreateBatchInput } from "../schemas";
import type { BatchListQuery } from "../types";

// Paginated batches for one type and stage; keeps the previous page visible while the next one loads.
export const useGetBatches = (query: BatchListQuery) =>
  useQuery({
    queryFn: () => getBatches(query),
    queryKey: ["get-batches", query],
    placeholderData: keepPreviousData,
  });

// One batch with its cases, fetched only while its sheet is open.
export const useGetBatch = (id: string | null) =>
  useQuery({
    queryFn: () => getBatch(id as string),
    queryKey: ["get-batch", id],
    enabled: !!id,
  });

// Agencies for the Assign dialog, fetched only while it is open.
export const useBatchOptions = (enabled: boolean) =>
  useQuery({
    queryFn: getBatchOptions,
    queryKey: ["get-batch-options"],
    enabled,
  });

// Live count of the cases a new batch would hold; runs while the New batch form is open and refreshes as the filters change.
export const useBatchPreview = (filters: Omit<CreateBatchInput, "name">, enabled: boolean) =>
  useQuery({
    queryFn: () => getBatchPreview(filters),
    queryKey: ["get-batch-preview", filters],
    enabled,
    placeholderData: keepPreviousData,
  });
