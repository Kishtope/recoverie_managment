import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { RETAILER_CAP } from "@/lib/retailer-import";
import { cn } from "@/lib/utils";
import type { RetailerImportSummary } from "../types";

type Row = RetailerImportSummary["perRetailer"][number];

// One row per retailer named in the file: how many customers it takes (out of the 20 allowed) and how many rows were turned away.
const columns: DataTableColumn<Row>[] = [
  {
    key: "retailer",
    header: "Retailer",
    cell: (r) => (
      <div className="flex flex-col">
        <span className="font-medium">{r.name}</span>
        <span className="text-xs text-muted-foreground">{r.code}</span>
      </div>
    ),
  },
  { key: "customers", header: "Customers", className: "text-right tabular-nums", cell: (r) => `${r.customers.toLocaleString("en-IN")} / ${RETAILER_CAP}` },
  {
    key: "rejected",
    header: "Rejected",
    className: "text-right",
    cell: (r) => (r.rejected ? <Badge variant="destructive">{r.rejected.toLocaleString("en-IN")}</Badge> : <span className="text-muted-foreground">-</span>),
  },
];

/**
 * @component RetailerSplitSummary
 * @description How a Customers file splits between Callers and Retailers, with a retailer-wise table (customers taken out of the 20 allowed, rows
 * rejected). Used by the upload preview and by the summary of a finished import.
 */
export const RetailerSplitSummary = ({ summary, className }: { summary: RetailerImportSummary; className?: string }) => (
  <div className={cn("flex flex-col gap-3", className)}>
    <p className="text-sm">
      <span className="font-medium tabular-nums">{summary.caller.toLocaleString("en-IN")}</span> caller customers ·{" "}
      <span className="font-medium tabular-nums">{summary.retailer.toLocaleString("en-IN")}</span> retailer customers
    </p>
    {summary.perRetailer.length > 0 && <DataTable columns={columns} rows={summary.perRetailer} getRowKey={(r) => r.retailerId} />}
  </div>
);
