"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useGetNotifications, useMarkNotificationsRead } from "../hooks/use-notifications";
import type { NotificationItem } from "../types";

// The sentence a notification shows, built from its type and the customer it is about.
const messageOf = (n: NotificationItem) => {
  const who = n.customerName ?? "a case";
  switch (n.type) {
    case "FOLLOW_UP_DUE":
      return `Follow-up due today: ${who}`;
    case "PTP_DUE":
      return `Promise to pay due today: ${who}`;
    case "ESCALATION":
      return `Refused / disputed, needs a manager: ${who}`;
    case "REASSIGNED":
      return `Assigned to you: ${who}`;
    case "RECRUITER_DEADLINE":
      return `Your time on this case is almost up: ${who}`;
  }
};

/**
 * @component NotificationBell
 * @description Bell in the app header with an unread count. The dropdown lists the latest notifications (due follow-ups and promises,
 * escalations, reassigned cases); clicking one marks it read and opens its case, and "Mark all read" clears the count.
 */
export const NotificationBell = () => {
  const router = useRouter();
  const { data } = useGetNotifications();
  const { mutate } = useMarkNotificationsRead();
  const unread = data?.unread ?? 0;

  const open = (n: NotificationItem) => {
    if (!n.read) mutate({ ids: [n.id] });
    router.push(`/cases/${n.loanId}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative" />}>
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => mutate({})}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {!data || data.items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing new.</p>
        ) : (
          data.items.map((n) => (
            <DropdownMenuItem key={n.id} onClick={() => open(n)} className="flex flex-col items-start gap-0.5">
              <span className={cn("text-sm", !n.read && "font-semibold")}>{messageOf(n)}</span>
              <span className="text-xs text-muted-foreground">
                {n.agreementNo ? `${n.agreementNo} · ` : ""}
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
