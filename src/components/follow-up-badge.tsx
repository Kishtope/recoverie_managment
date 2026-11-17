import { format, parse } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { todayIst } from "@/lib/dates";

/**
 * @component FollowUpBadge
 * @description A follow-up date ("yyyy-MM-dd") as a pill: red when overdue, solid when due today, outlined when upcoming, "-" when none.
 */
export const FollowUpBadge = ({ day }: { day: string | null }) => {
  if (!day) return <span className="text-muted-foreground">-</span>;
  const label = format(parse(day, "yyyy-MM-dd", new Date()), "dd MMM");
  const today = todayIst();
  if (day < today) return <Badge variant="destructive">Overdue · {label}</Badge>;
  if (day === today) return <Badge>Today</Badge>;
  return <Badge variant="outline">{label}</Badge>;
};
