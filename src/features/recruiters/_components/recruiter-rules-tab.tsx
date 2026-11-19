"use client";

import Link from "next/link";
import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { StatCard } from "@/components/stat-card";
import { useMe } from "@/features/auth/hooks/use-me";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGetRecruiterOptions } from "../hooks/use-get-recruiters";

// The steps the daily job follows for every case a recruiter holds, in order.
const STEPS = [
  "The timer starts the day the case is assigned to the recruiter.",
  "The recruiter sees the days left on the case and gets a reminder shortly before the deadline.",
  "An open promise to pay, or a part payment with a follow-up, keeps the timer running until that date.",
  "Once the limit passes without full payment, the case moves to the caller with the fewest cases in the recruiter's team.",
  "The recruiter can still read the case, but only the new owner can work it. Every move is written to the audit log.",
];

/**
 * @component RecruiterRulesTab
 * @description Shows the escalation rules in force (days a recruiter keeps a case, reminder days) and how the daily job applies them. Read-only
 * here; an Admin changes the numbers on the Settings page.
 */
export const RecruiterRulesTab = () => {
  const { data: me } = useMe();
  const { data, isPending, isError, error } = useGetRecruiterOptions();

  if (isPending) return <LoadingView message="Loading rules…" />;
  if (isError) return <ErrorView message={getErrorMessage(error, "Couldn't load the rules.")} />;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Recruiter keeps a case for" value={`${data.rules.escalationDays} days`} note="Then it moves to a caller" />
        <StatCard label="Reminder" value={`${data.rules.reminderDays} days before`} note="The recruiter is notified this far ahead" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>How a case moves to a caller</CardTitle>
          <CardDescription>The system checks every recruiter case once a day.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
            {STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
      {me?.role === "ADMIN" && (
        <div>
          <Button variant="outline" nativeButton={false} render={<Link href="/settings" />}>
            <SettingsIcon data-icon="inline-start" />
            Change in Settings
          </Button>
        </div>
      )}
    </div>
  );
};
