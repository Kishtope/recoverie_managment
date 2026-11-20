import type { ReactNode } from "react";
import { format, parse } from "date-fns";
import { BuildingIcon, CalendarDaysIcon, FingerprintIcon, HashIcon, MapPinIcon, PhoneCallIcon, PhoneIcon, StoreIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LoanDetail } from "../types";

// One line of a details list: a round icon, a small label, and the value (empty values show "-"). `mono` is for ids that should stay readable character by character.
const DetailRow = ({ icon: Icon, label, children, mono }: { icon: LucideIcon; label: string; children: ReactNode; mono?: boolean }) => (
  <div className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icon className="size-4" aria-hidden />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <dt className="kicker text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs wrap-break-word" : "text-sm font-medium wrap-break-word"}>
        {children === null || children === undefined || children === "" ? <span className="font-normal text-muted-foreground">-</span> : children}
      </dd>
    </div>
  </div>
);

// A titled half of the card: the heading, then its rows divided by hairlines so a long list stays easy to scan.
const Half = ({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) => (
  <section className="flex min-w-0 flex-col gap-4 p-5 md:p-6">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xl">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

/**
 * @component CaseDetailsCard
 * @description Customer and loan details in one panel, side by side on wide screens and stacked on phones. Each fact is a labelled row with an
 * icon; the customer's references sit below as small contact tiles. Everything is read-only, and mobile numbers arrive already masked.
 * @param loan The case from the detail route.
 */
export const CaseDetailsCard = ({ loan }: { loan: LoanDetail }) => {
  const { customer, retailer } = loan;
  const place = [customer.area, customer.pin].filter(Boolean).join(" · ");
  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid min-w-0 divide-y divide-border p-0 md:grid-cols-2 md:divide-x md:divide-y-0">
        <Half title="Customer">
          <dl className="flex flex-col divide-y divide-border">
            <DetailRow icon={PhoneIcon} label="Mobile">{customer.mobilePrimary}</DetailRow>
            <DetailRow icon={PhoneCallIcon} label="Alternate">{customer.mobileAlt}</DetailRow>
            <DetailRow icon={MapPinIcon} label="Address">
              {customer.address}
              {place && <span className="block text-xs font-normal text-muted-foreground">{place}</span>}
            </DetailRow>
          </dl>
          {customer.references.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="kicker flex items-center gap-1.5 text-muted-foreground">
                <UsersIcon className="size-3.5" aria-hidden />
                References
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {customer.references.map((r, i) => (
                  <li key={i} className="flex min-w-0 flex-col rounded-[14px] border border-border px-3 py-2 text-sm">
                    <span className="truncate font-medium">{r.name || "-"}</span>
                    <span className="truncate text-xs text-muted-foreground">{[r.relation, r.mobile].filter(Boolean).join(" · ") || "-"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Half>

        <Half title="Loan" aside={<Badge variant={loan.status === "ACTIVE" ? "secondary" : "outline"}>{loan.status === "ACTIVE" ? "Active" : "Closed"}</Badge>}>
          <dl className="flex flex-col divide-y divide-border">
            <DetailRow icon={FingerprintIcon} label="Loan ID" mono>{loan.agreementNo}</DetailRow>
            <DetailRow icon={HashIcon} label="Case ID" mono>{loan.id}</DetailRow>
            <DetailRow icon={BuildingIcon} label="Company and branch">{`${loan.company} · ${loan.branch}`}</DetailRow>
            <DetailRow icon={CalendarDaysIcon} label="Disbursed on">{loan.disbursedOn ? format(parse(loan.disbursedOn, "yyyy-MM-dd", new Date()), "dd MMM yyyy") : null}</DetailRow>
            <DetailRow icon={StoreIcon} label="Retailer">
              {retailer ? (
                <>
                  {retailer.name} ({retailer.code})
                  <span className="block text-xs font-normal text-muted-foreground">{[retailer.city, retailer.mobile].filter(Boolean).join(" · ")}</span>
                </>
              ) : null}
            </DetailRow>
          </dl>
        </Half>
      </CardContent>
    </Card>
  );
};
