import Link from "next/link";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/data-table";
import { OutcomeBadge } from "@/components/outcome-badge";
import { formatInr } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import type { RecruiterCaseItem } from "../types";

// How a case's time left reads: red when it is at or inside the reminder window or past the limit, plain otherwise.
const DaysLeft = ({ item, reminderDays }: { item: RecruiterCaseItem; reminderDays: number }) => {
  if (item.overdue) return <Badge variant="destructive">Past limit</Badge>;
  const text = item.daysLeft === 0 ? "Last day" : `${item.daysLeft} ${item.daysLeft === 1 ? "day" : "days"} left`;
  return <Badge variant={item.daysLeft <= reminderDays ? "destructive" : "secondary"}>{text}</Badge>;
};

// Columns of the Cases tab. The case cell links to the case page and shows the customer on a muted second line; "Time left" is the headline
// column (the table is sorted by it); the deadline date sits under the badge so the number can be checked at a glance.
export const getRecruiterCasesColumns = ({ reminderDays }: { reminderDays: number }): DataTableColumn<RecruiterCaseItem>[] => [
  {
    key: "case",
    header: "Case",
    cell: (c) => (
      <div className="min-w-0">
        <Link href={`/cases/${c.loanId}`} className="truncate font-medium underline-offset-4 hover:underline">{c.agreementNo}</Link>
        <div className="truncate text-xs text-muted-foreground">{c.customerName}</div>
      </div>
    ),
  },
  {
    key: "recruiter",
    header: "Recruiter",
    cell: (c) => (
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback>{getInitials(c.recruiter.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate">{c.recruiter.name}</span>
      </div>
    ),
  },
  { key: "assignedOn", header: "Assigned on", cell: (c) => format(new Date(c.assignedOn), "dd/MM/yyyy") },
  {
    key: "timeLeft",
    header: "Time left",
    cell: (c) => (
      <div className="flex flex-col items-start gap-1">
        <DaysLeft item={c} reminderDays={reminderDays} />
        <span className="text-xs text-muted-foreground">until {format(new Date(`${c.deadline}T00:00:00`), "dd MMM")}</span>
      </div>
    ),
  },
  { key: "dpd", header: "DPD", cell: (c) => c.dpd ?? "-" },
  { key: "overdue", header: "Overdue", cell: (c) => <span className="tabular-nums">{formatInr(c.overdueAmount)}</span> },
  { key: "outcome", header: "Last outcome", cell: (c) => <OutcomeBadge outcome={c.lastOutcome} /> },
];
