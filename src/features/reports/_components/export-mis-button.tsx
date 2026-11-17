"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { TeamFilters } from "@/features/dashboard/types";
import { useExportMis } from "../hooks/use-export-mis";

/**
 * @component ExportMisButton
 * @description "Export Excel" button for the dashboard and Recovery page: downloads the Daily MIS for the filters currently on screen.
 * @param query The page's current filters (the same object the dashboard hooks use).
 */
export const ExportMisButton = ({ query }: { query: TeamFilters }) => {
  const { mutate, isPending } = useExportMis();
  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={() => mutate(query)}>
      {isPending ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
      {isPending ? "Exporting…" : "Export Excel"}
    </Button>
  );
};
