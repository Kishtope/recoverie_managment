import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImportRunItem } from "../types";

// One big number with its label.
const Stat = ({ label, value, className }: { label: string; value: number; className?: string }) => (
  <div className={cn("flex flex-col gap-1 rounded-[14px] border border-border p-4", className)}>
    <span className="kicker text-muted-foreground">{label}</span>
    <span className="display-number text-4xl">{value.toLocaleString("en-IN")}</span>
  </div>
);

/**
 * @component ImportSummary
 * @description Totals of one import run: rows read, new, updated, unchanged and rejected, with a link to the rejected rows.
 * @param onOpenErrors Opens the error list; shown only when some rows failed.
 */
export const ImportSummary = ({ run, onOpenErrors, className }: { run: ImportRunItem; onOpenErrors: () => void; className?: string }) => (
  <div className={cn("flex flex-col gap-3", className)}>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Stat label="Rows" value={run.totalRows} />
      <Stat label="New" value={run.created} />
      <Stat label="Updated" value={run.updated} />
      <Stat label="Unchanged" value={run.unchanged} />
      <Stat label="Errors" value={run.failed} className={run.failed ? "border-destructive" : undefined} />
    </div>
    {run.failed > 0 && (
      <div>
        <Button size="sm" variant="outline" onClick={onOpenErrors}>View errors</Button>
      </div>
    )}
  </div>
);
