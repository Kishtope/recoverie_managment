import { Badge } from "@/components/ui/badge";
import { CASE_STATUS_LABELS, RISK_TAG_LABELS, type CaseStatus, type PtpStatus, type RiskTag } from "@/lib/case-status";
import { cn } from "@/lib/utils";

// Visual weight per status: money received is green, promises highlighted, side states that block work are red / outlined.
const STATUS_STYLE: Record<CaseStatus, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  NEW: { variant: "outline" },
  ASSIGNED: { variant: "secondary" },
  IN_PROGRESS: { variant: "secondary" },
  PROMISE_TO_PAY: { variant: "default", className: "bg-brand-peach text-foreground" },
  PARTIALLY_PAID: { variant: "secondary", className: "text-success" },
  PAID: { variant: "default", className: "bg-success text-success-foreground" },
  CLOSED: { variant: "outline" },
  DISPUTE: { variant: "destructive" },
  UNREACHABLE: { variant: "outline" },
  FIELD_VISIT: { variant: "outline" },
};

/**
 * @component CaseStatusBadge
 * @description Pill showing a case's derived lifecycle status (New, Assigned, In progress, Promise to pay, ...).
 */
export const CaseStatusBadge = ({ status, className }: { status: CaseStatus; className?: string }) => {
  const { variant, className: extra } = STATUS_STYLE[status];
  return (
    <Badge variant={variant} className={cn(extra, className)}>
      {CASE_STATUS_LABELS[status]}
    </Badge>
  );
};

/**
 * @component RiskTagBadge
 * @description Pill showing the customer's risk tag; "Good" is quiet, the others escalate in weight.
 */
export const RiskTagBadge = ({ tag, className }: { tag: RiskTag; className?: string }) => (
  <Badge variant={tag === "CHRONIC" || tag === "DISPUTED" ? "destructive" : tag === "IRREGULAR" ? "secondary" : "outline"} className={className}>
    {RISK_TAG_LABELS[tag]}
  </Badge>
);

/**
 * @component PtpStatusBadge
 * @description Pill for the most recent promise to pay: pending, kept or broken. Renders nothing when there was no promise.
 */
export const PtpStatusBadge = ({ status, className }: { status: PtpStatus | null; className?: string }) => {
  if (!status) return null;
  return (
    <Badge
      variant={status === "BROKEN" ? "destructive" : status === "KEPT" ? "default" : "secondary"}
      className={cn(status === "KEPT" && "bg-success text-success-foreground", className)}
    >
      Promise {status.toLowerCase()}
    </Badge>
  );
};
