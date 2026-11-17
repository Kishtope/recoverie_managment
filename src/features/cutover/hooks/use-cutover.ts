import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/get-error-message";
import { checkStaff, downloadCutoverCsv, getCutover } from "../api";
import type { CutoverQuery } from "../types";

// One page of the readiness table; keeps the previous page visible while the next one loads.
export const useGetCutover = (query: CutoverQuery) =>
  useQuery({
    queryFn: () => getCutover(query),
    queryKey: ["get-cutover", query],
    placeholderData: keepPreviousData,
  });

// Downloads the readiness CSV: fetches it, then saves it through a temporary link. The toast lives here, not in the component.
export const useExportCutover = () =>
  useMutation({
    mutationFn: downloadCutoverCsv,
    mutationKey: ["export-cutover"],
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      toast.add({ title: "Readiness list downloaded", type: "success" });
    },
    onError: (error) => {
      toast.add({ title: "Couldn't export", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });

// Checks an uploaded staff list against the app's users; the result is read from the mutation's data, nothing is refreshed.
export const useCheckStaff = () =>
  useMutation({
    mutationFn: checkStaff,
    mutationKey: ["check-staff"],
    onError: (error) => {
      toast.add({ title: "Couldn't check the file", description: getErrorMessage(error, "Please try again."), type: "error" });
    },
  });
