import Link from "next/link";
import { format } from "date-fns";
import { EyeIcon, PencilIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/data-table";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import type { LoanListItem } from "../types";

// Up to two initials from a full name for the avatar fallback.
const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// Empty optional values show as "-".
const orDash = (value?: string | number | null) => (value === null || value === undefined || value === "" ? "-" : value);

// Columns of the Cases table. `showAgent` is off for agents (every case is their own); `showRetailer` is on for Admins only. The customer cell holds a real link so keyboard
// users can open the case; rows themselves are not clickable (the View details button does that).
export const getCasesColumns = ({ showAgent, showRetailer = false, onEditOverdue }: { showAgent: boolean; showRetailer?: boolean; onEditOverdue?: (loan: LoanListItem) => void }): DataTableColumn<LoanListItem>[] => [
  {
    key: "customer",
    header: "Customer",
    cell: (l) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(l.customerName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link href={`/cases/${l.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium hover:underline">
            {l.customerName}
          </Link>
          <div className="truncate text-xs text-muted-foreground">
            {orDash(l.mobile)}
            {l.area ? ` · ${l.area}` : ""}
          </div>
        </div>
      </div>
    ),
  },
  { key: "agreementNo", header: "Agreement no.", cell: (l) => l.agreementNo },
  { key: "branch", header: "Company · branch", cell: (l) => `${l.company} · ${l.branch}` },
  { key: "dpd", header: "DPD", cell: (l) => orDash(l.dpd) },
  {
    key: "overdue",
    header: "Overdue",
    // Admin / Manager get a pencil beside the amount that opens the edit dialog (the API enforces the role again).
    cell: (l) => (
      <div className="flex items-center gap-1">
        <span>{formatInr(l.overdueAmount)}</span>
        {onEditOverdue && (
          <Button size="icon-sm" variant="ghost" aria-label={`Edit overdue amount for ${l.customerName}`} onClick={() => onEditOverdue(l)}>
            <PencilIcon />
          </Button>
        )}
      </div>
    ),
  },
  {
    key: "lastOutcome",
    header: "Last outcome",
    cell: (l) => (
      <div className="flex flex-wrap items-center gap-1">
        <OutcomeBadge outcome={l.lastOutcome} />
        {l.lastPtpAmount !== null && <span className="text-xs text-muted-foreground">{formatInr(l.lastPtpAmount)}</span>}
        {l.fieldVisitFlag && <Badge variant="outline">Field visit</Badge>}
        {l.escalated && <Badge variant="destructive">Escalated</Badge>}
      </div>
    ),
  },
  { key: "followUp", header: "Next follow-up", cell: (l) => <FollowUpBadge day={l.nextFollowUpOn} /> },
  ...(showAgent
    ? [
        { key: "agent", header: "Agent", cell: (l: LoanListItem) => (l.agent ? l.agent.name : <Badge variant="outline">Unassigned</Badge>) },
        { key: "assignedOn", header: "Assigned on", cell: (l: LoanListItem) => (l.assignedOn ? format(new Date(l.assignedOn), "dd MMM yyyy") : "-") },
      ]
    : []),
  ...(showRetailer
    ? [{ key: "retailer", header: "Retailer", cell: (l: LoanListItem) => (l.retailer ? l.retailer.name : <Badge variant="outline">No retailer</Badge>) }]
    : []),
  {
    key: "actions",
    header: "",
    className: "text-right",
    // Explicit "View details" button that opens the case page.
    cell: (l) => (
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/cases/${l.id}`} onClick={(e) => e.stopPropagation()} />}>
        <EyeIcon data-icon="inline-start" />
        View details
      </Button>
    ),
  },
];
