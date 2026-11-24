import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * @component ExportExcelButton
 * @description Outline "Export Excel" button with a spinner while the file is being built. The parent owns the export mutation.
 * @param onClick Starts the export.
 * @param isPending True while the export request is running.
 */
export const ExportExcelButton = ({ onClick, isPending, className }: { onClick: () => void; isPending: boolean; className?: string }) => (
  <Button variant="outline" size="sm" className={cn(className)} disabled={isPending} onClick={onClick}>
    {isPending ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
    {isPending ? "Exporting…" : "Export Excel"}
  </Button>
);
