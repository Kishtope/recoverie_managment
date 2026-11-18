import Link from "next/link";
import { EyeIcon, PhoneIcon, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/data-table";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { OutcomeBadge } from "@/components/outcome-badge";
import type { LoanListItem } from "@/features/cases/types";
import type { FollowUpTabValue } from "../types";

// Empty optional values show as "-".
const orDash = (value?: string | number | null) => (value === null || value === undefined || value === "" ? "-" : value);

// Customer cell: name with their (masked) numbers as small pills underneath, like the old site. The name is a real link to the case.
const customerColumn: DataTableColumn<LoanListItem> = {
  key: "customer",
  header: "Customer",
  cell: (l) => (
    <div className="flex min-w-0 flex-col gap-1">
      <Link href={`/cases/${l.id}`} className="flex items-center gap-1 truncate font-medium hover:underline">
        <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
        {l.customerName}
      </Link>
      <div className="flex flex-wrap gap-1">
        {l.mobile && (
          <Badge variant="secondary">
            <PhoneIcon data-icon="inline-start" />
            {l.mobile}
          </Badge>
        )}
        {l.mobileAlt && (
          <Badge variant="outline">
            <PhoneIcon data-icon="inline-start" />
            {l.mobileAlt}
          </Badge>
        )}
      </div>
    </div>
  ),
};

// Agreement number with the area/branch as a muted second line.
const agreementColumn: DataTableColumn<LoanListItem> = {
  key: "agreementNo",
  header: "Agreement no.",
  cell: (l) => (
    <div className="min-w-0">
      <div className="font-medium">{l.agreementNo}</div>
      <div className="truncate text-xs text-muted-foreground">{l.area ?? "-"}</div>
    </div>
  ),
};

// Which company and branch financed the case (our data has no dealer details).
const financedByColumn: DataTableColumn<LoanListItem> = {
  key: "financedBy",
  header: "Financed by",
  cell: (l) => (
    <div className="min-w-0">
      <div className="truncate">{l.company}</div>
      <div className="truncate text-xs text-muted-foreground">{l.branch}</div>
    </div>
  ),
};

// One button that opens the case, where the agent calls and records the outcome.
const actionColumn: DataTableColumn<LoanListItem> = {
  key: "actions",
  header: "Action",
  className: "text-right",
  cell: (l) => (
    <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/cases/${l.id}`} />}>
      <EyeIcon data-icon="inline-start" />
      Open case
    </Button>
  ),
};

// Columns of the Follow-ups table for one tab. New / Today / Post share the same shape; Closed shows status instead of dues, due date and remark.
export const getFollowUpColumns = (tab: FollowUpTabValue): DataTableColumn<LoanListItem>[] =>
  tab === "closed"
    ? [
        customerColumn,
        agreementColumn,
        { key: "status", header: "Status", cell: () => <Badge variant="secondary">Closed</Badge> },
        financedByColumn,
        actionColumn,
      ]
    : [
        customerColumn,
        agreementColumn,
        { key: "dues", header: "No. of dues", cell: (l) => <Badge variant="secondary">{orDash(l.pendingEmis)}</Badge> },
        { key: "due", header: "Due", cell: (l) => (tab === "new" ? "-" : <FollowUpBadge day={l.nextFollowUpOn} />) },
        { key: "remark", header: "Remark", cell: (l) => <OutcomeBadge outcome={l.lastOutcome} /> },
        financedByColumn,
        actionColumn,
      ];
