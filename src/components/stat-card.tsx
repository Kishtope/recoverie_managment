import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * @component StatCard
 * @description One dashboard card: small label, big number and an optional muted line. Becomes a link when `href` is given.
 * Flat (border, no shadow) per the brand's "no glassy cards".
 */
export const StatCard = ({ label, value, note, href, className }: { label: string; value: string; note?: string; href?: string; className?: string }) => {
  const card = (
    <Card className={cn(href && "transition-colors hover:bg-muted/50", className)}>
      <CardContent className="flex flex-col gap-1">
        <span className="kicker text-muted-foreground">{label}</span>
        <span className="display-number text-4xl">{value}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
};
