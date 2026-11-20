import { Badge } from "@/components/ui/badge";
import { outcomeLabel, type OUTCOMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Visual weight per outcome: money received is green, promises are highlighted, refusals are red, dead ends are muted.
const OUTCOME_STYLE: Record<(typeof OUTCOMES)[number], { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  PAID: { variant: "default", className: "bg-success text-success-foreground" },
  PART_PAID: { variant: "secondary", className: "text-success" },
  PTP: { variant: "default", className: "bg-brand-peach text-foreground" },
  CALLBACK: { variant: "secondary" },
  NOT_REACHABLE: { variant: "outline" },
  WRONG_NUMBER: { variant: "outline" },
  REFUSED_DISPUTE: { variant: "destructive" },
  NOT_INTERESTED: { variant: "outline" },
};

/**
 * @component OutcomeBadge
 * @description Pill showing an outcome code as its readable label; shows "-" when the case has no outcome yet.
 * @param detail The saved outcome detail (e.g. BUSY), when known; the pill then says "Call busy" instead of "Not reachable".
 */
export const OutcomeBadge = ({ outcome, detail, className }: { outcome: (typeof OUTCOMES)[number] | null; detail?: string | null; className?: string }) => {
  if (!outcome) return <span className="text-muted-foreground">-</span>;
  const { variant, className: extra } = OUTCOME_STYLE[outcome];
  return (
    <Badge variant={variant} className={cn(extra, className)}>
      {outcomeLabel(outcome, detail)}
    </Badge>
  );
};
