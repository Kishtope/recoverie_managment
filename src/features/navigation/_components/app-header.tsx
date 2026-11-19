"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/hooks/use-me";
import { NotificationBell } from "@/features/notifications/_components/notification-bell";
import { ROLE_LABELS, isWorkerRole } from "@/lib/constants";

// Display names for the first URL segment of each module; unknown segments fall back to a capitalised slug.
const SECTION_TITLES: Record<string, string> = {
  batches: "Batches",
  calls: "Calls",
  cases: "Cases",
  cutover: "Cut-over",
  "follow-ups": "Follow-ups",
  imports: "Imports",
  performance: "Performance",
  scorecards: "Performance",
  recovery: "Recovery",
  settings: "Settings",
  team: "Team",
};

type Crumb = { label: string; href?: string };

// Builds the breadcrumb trail from the pathname: Dashboard > Module > Details (the last crumb is the current page, so it has no link).
const getCrumbs = (pathname: string, isAgent: boolean): Crumb[] => {
  const [section, id] = pathname.split("/").filter(Boolean);
  if (!section) return [{ label: "Dashboard" }];

  const sectionLabel = section === "cases" && isAgent ? "My cases" : section === "calls" && isAgent ? "My calls" : (SECTION_TITLES[section] ?? section.charAt(0).toUpperCase() + section.slice(1));
  const trail: Crumb[] = [{ label: "Dashboard", href: "/" }];
  if (id) {
    trail.push({ label: sectionLabel, href: `/${section}` }, { label: "Details" });
  } else {
    trail.push({ label: sectionLabel });
  }
  return trail;
};

/**
 * @component AppHeader
 * @description Sticky top bar for every signed-in page: sidebar toggle, a breadcrumb that follows the current route,
 * and the user's role plus today's date on the right (hidden on small screens to keep the bar uncluttered).
 */
export const AppHeader = () => {
  const pathname = usePathname();
  const { data: me, isPending } = useMe();
  const crumbs = getCrumbs(pathname, isWorkerRole(me?.role));

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur supports-backdrop-filter:bg-background/70">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5 data-vertical:self-center" />

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="h-full flex-nowrap items-center">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <Fragment key={crumb.label}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className="min-w-0 items-center">
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage className="truncate font-heading text-base leading-none pt-1">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={crumb.href} />} className="truncate">
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <NotificationBell />

      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <span className="text-sm text-muted-foreground">{format(new Date(), "EEE, dd MMM yyyy")}</span>
        {isPending ? <Skeleton className="h-6 w-20 rounded-full" /> : me && <Badge variant="secondary">{ROLE_LABELS[me.role]}</Badge>}
      </div>
    </header>
  );
};
