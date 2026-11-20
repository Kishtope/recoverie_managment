import Link from "next/link";
import type { DataTableColumn } from "@/components/data-table";
import { formatInr } from "@/lib/format";
import type { RetailerPerformanceItem } from "../types";
import { RetailerStatusBadge } from "./retailers-table";

// Columns of the Overview performance table: one row per retailer with its customers, what is outstanding and what was collected in the period.
export const retailerPerformanceColumns: DataTableColumn<RetailerPerformanceItem>[] = [
  {
    key: "retailer",
    header: "Retailer",
    cell: (r) => (
      <div className="min-w-0">
        <Link href={`/retailers/${r.retailerId}`} className="block truncate font-medium hover:underline">
          {r.name}
        </Link>
        <div className="truncate text-xs text-muted-foreground">{r.code}</div>
      </div>
    ),
  },
  { key: "status", header: "Status", cell: (r) => <RetailerStatusBadge status={r.status} /> },
  { key: "customers", header: "Customers", className: "text-right tabular-nums", cell: (r) => r.customers.toLocaleString("en-IN") },
  { key: "outstanding", header: "Outstanding", className: "text-right tabular-nums", cell: (r) => formatInr(r.outstanding) },
  { key: "collected", header: "Collected", className: "text-right tabular-nums", cell: (r) => formatInr(r.collected) },
];
