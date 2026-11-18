import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * @component TargetProgress
 * @description A thin bar showing how much of a target is done, with the percentage beside it. The bar stops at 100% but the number can go higher.
 * @param pct Achievement in percent, or null when there is no target (renders nothing).
 */
export const TargetProgress = ({ pct, className }: { pct: number | null; className?: string }) => {
  if (pct === null) return null;
  return (
    <div className={cn("flex min-w-24 items-center gap-2", className)}>
      <Progress value={Math.min(100, pct)} aria-label="Target achieved" className="flex-1 flex-nowrap gap-0" />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
};
