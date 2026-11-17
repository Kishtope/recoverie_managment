import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "INITIATED" | "CONNECTED" | "MISSED" | "FAILED";

const STATUS_STYLE: Record<Status, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  INITIATED: { label: "Ringing", variant: "secondary" },
  CONNECTED: { label: "Connected", variant: "default", className: "bg-success text-success-foreground" },
  MISSED: { label: "Missed", variant: "outline" },
  FAILED: { label: "Failed", variant: "destructive" },
};

/**
 * @component CallStatusBadge
 * @description Pill showing a call's status (Ringing / Connected / Missed / Failed); shared by the case page, the Calls list and Follow-ups.
 */
export const CallStatusBadge = ({ status, className }: { status: Status; className?: string }) => {
  const { label, variant, className: extra } = STATUS_STYLE[status];
  return (
    <Badge variant={variant} className={cn(extra, className)}>
      {label}
    </Badge>
  );
};
