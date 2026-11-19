import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DataTableColumn } from "@/components/data-table";
import { formatInr } from "@/lib/format";
import { getInitials } from "@/lib/get-initials";
import type { RecruiterPerformanceItem } from "../types";

// Columns of the Performance tab. "With them now" and "Due now" describe today; the rest cover the chosen period. "Recovered in limit"
// counts only money paid while the case was still the recruiter's.
export const getRecruiterPerformanceColumns = (): DataTableColumn<RecruiterPerformanceItem>[] => [
  {
    key: "recruiter",
    header: "Recruiter",
    cell: (r) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(r.recruiter.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate font-medium">{r.recruiter.name}</span>
      </div>
    ),
  },
  { key: "heldNow", header: "With them now", cell: (r) => <span className="tabular-nums">{r.heldNow}</span> },
  { key: "dueNow", header: "Due now", cell: (r) => <span className="tabular-nums">{formatInr(r.dueNow)}</span> },
  { key: "received", header: "Received", cell: (r) => <span className="tabular-nums">{r.received}</span> },
  { key: "recovered", header: "Recovered in limit", cell: (r) => <span className="font-medium tabular-nums">{formatInr(r.recoveredInLimit)}</span> },
  { key: "escalated", header: "Escalated", cell: (r) => <span className="tabular-nums">{r.escalated}</span> },
];
