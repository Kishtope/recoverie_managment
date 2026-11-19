import Link from "next/link";
import { format } from "date-fns";
import { ArrowRightIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DataTableColumn } from "@/components/data-table";
import { formatInr } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import type { EscalationItem } from "../types";

// Columns of the Escalations tab: the case, the hand-over (recruiter to caller), how long the recruiter kept it, and what came in afterwards.
export const getRecruiterEscalationsColumns = (): DataTableColumn<EscalationItem>[] => [
  {
    key: "case",
    header: "Case",
    cell: (e) => (
      <div className="min-w-0">
        <Link href={`/cases/${e.loanId}`} className="truncate font-medium underline-offset-4 hover:underline">{e.agreementNo}</Link>
        <div className="truncate text-xs text-muted-foreground">{e.customerName}</div>
      </div>
    ),
  },
  {
    key: "handover",
    header: "Moved from → to",
    cell: (e) => (
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback>{getInitials(e.recruiter.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate">{e.recruiter.name}</span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-label="moved to" />
        <span className="truncate">{e.newOwner ?? "-"}</span>
      </div>
    ),
  },
  { key: "escalatedOn", header: "Moved on", cell: (e) => format(new Date(e.escalatedOn), "dd/MM/yyyy") },
  { key: "daysHeld", header: "Kept for", cell: (e) => `${e.daysHeld} ${e.daysHeld === 1 ? "day" : "days"}` },
  { key: "overdue", header: "Overdue", cell: (e) => <span className="tabular-nums">{formatInr(e.overdueAmount)}</span> },
  { key: "recovered", header: "Paid since", cell: (e) => <span className="tabular-nums">{e.recoveredSince ? formatInr(e.recoveredSince) : "-"}</span> },
];
