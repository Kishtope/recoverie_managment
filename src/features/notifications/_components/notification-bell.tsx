"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { BellIcon, BellOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  }
};

/**
 * @component NotificationBell
 * @description Bell in the app header with an unread count. It opens a side sheet listing the latest notifications (due follow-ups and
 * promises, escalations, reassigned cases); clicking one marks it read, closes the sheet and opens its case, and "Mark all read" clears the count.
 */
export const NotificationBell = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data } = useGetNotifications();
  const { mutate } = useMarkNotificationsRead();
  const unread = data?.unread ?? 0;

  // Marks one notification read, then goes to its case.
  const openCase = (n: NotificationItem) => {
    if (!n.read) mutate({ ids: [n.id] });
    setOpen(false);
    router.push(`/cases/${n.loanId}`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative" />}>
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>{unread ? `${unread} unread` : "You're all caught up."}</SheetDescription>
          {unread > 0 && (
            <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={() => mutate({})}>
              Mark all read
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col px-4 pb-4">
            {!data || data.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellOffIcon />
                  </EmptyMedia>
                  <EmptyTitle>Nothing new</EmptyTitle>
                  <EmptyDescription>Due follow-ups, promises and reassigned cases show up here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openCase(n)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[14px] border border-border p-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        !n.read && "bg-muted/50",
                      )}
                    >
                      {/* Unread marker; read items keep the space so the text lines up. */}
                      <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-accent")} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-sm wrap-break-word", !n.read && "font-semibold")}>{messageOf(n)}</span>
                        <span className="text-xs text-muted-foreground">
                          {n.agreementNo ? `${n.agreementNo} · ` : ""}
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
