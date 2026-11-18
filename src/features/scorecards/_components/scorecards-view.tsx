"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { DownloadIcon, TargetIcon, TriangleAlertIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EntityContainer } from "@/components/entity-components/entity-container";
import { EntityEmptyView } from "@/components/entity-components/entity-empty-view";
import { EntityHeader } from "@/components/entity-components/entity-header";
import { ErrorView } from "@/components/entity-components/error-view";
import { LoadingView } from "@/components/entity-components/loading-view";
import { FilterSelect } from "@/components/filter-select";
import { TargetProgress } from "@/components/target-progress";
import { useMe } from "@/features/auth/hooks/use-me";
import { formatDuration, formatInr } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/get-initials";
import { SCORECARD_ALERT_LABELS, type ScorecardRow } from "@/lib/scorecard";
import { cn } from "@/lib/utils";
import { useExportScorecard } from "../hooks/use-export-scorecard";
import { useGetScorecards } from "../hooks/use-get-scorecards";
import { SCORECARD_MONTHS, useScorecardParams } from "../hooks/use-scorecard-params";
import { SetTargetDialog } from "./set-target-dialog";

// Percentage as "25%", or "-" when it cannot be worked out (nothing due, no calls...).
const pct = (v: number | null) => (v === null ? "-" : `${v}%`);

/**
 * @component ScorecardsView
 * @description Monthly leaderboard and scorecard for every caller in the user's scope: rank by money collected, recovery %, target vs achievement,
 * calls and contact %, promises kept, cases resolved and alerts for anyone far behind. Admin and Manager can set targets and download the
 * workbook; the month lives in the URL. A row opens that caller's cases.
 */
export const ScorecardsView = () => {
  const router = useRouter();
  const { data: me } = useMe();
  const params = useScorecardParams();
  const month = params.filters.month;
  const { data, isPending, isError, error, isPlaceholderData } = useGetScorecards(month);
  const { mutate: exportFile, isPending: exporting } = useExportScorecard();
  // The caller whose target dialog is open.
  const [editing, setEditing] = useState<ScorecardRow | null>(null);

  const canManage = me?.role === "ADMIN" || me?.role === "MANAGER";
  const monthOptions = useMemo(() => SCORECARD_MONTHS.map((m) => ({ value: m, label: format(parse(m, "yyyy-MM", new Date()), "MMM yyyy") })), []);

  const columns: DataTableColumn<ScorecardRow>[] = [
    { key: "rank", header: "#", cell: (r) => <Badge variant={r.rank <= 3 ? "default" : "outline"}>{r.rank}</Badge> },
    {
      key: "name",
      header: "Caller",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(r.name)}</AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{r.name}</span>
        </div>
      ),
    },
    {
      key: "collected",
      header: "Collected",
      cell: (r) => (
        <div className="flex min-w-40 flex-col gap-1">
          <span className="font-medium">{formatInr(r.collected)}</span>
          {r.targetAmount ? <span className="text-xs text-muted-foreground">of {formatInr(r.targetAmount)}</span> : <span className="text-xs text-muted-foreground">No target</span>}
          <TargetProgress pct={r.achievementPct} />
        </div>
      ),
    },
    { key: "recovery", header: "Recovery", cell: (r) => pct(r.recoveryPct) },
    {
      key: "resolved",
      header: "Resolved",
      cell: (r) => (r.targetResolved ? `${r.resolved} / ${r.targetResolved}` : r.resolved),
    },
    { key: "cases", header: "Cases", cell: (r) => r.allocated },
    { key: "calls", header: "Calls", cell: (r) => r.calls },
    { key: "contact", header: "Contact", cell: (r) => pct(r.contactPct) },
    { key: "missed", header: "Missed", cell: (r) => r.missed },
    { key: "failed", header: "Failed", cell: (r) => r.failed },
    { key: "callback", header: "Callback", cell: (r) => (r.inboundMissed ? `${pct(r.callbackPct)} of ${r.inboundMissed}` : "-") },
    { key: "talk", header: "Avg talk", cell: (r) => formatDuration(r.avgTalkSec) },
    { key: "ptp", header: "PTP kept", cell: (r) => (r.ptpTaken ? `${r.ptpKept} / ${r.ptpTaken} (${pct(r.ptpKeptPct)})` : "-") },
    {
      key: "alerts",
      header: "Alerts",
      cell: (r) =>
        r.alerts.length ? (
          <div className="flex flex-wrap gap-1">
            {r.alerts.map((a) => (
              <Badge key={a} variant="destructive">
                <TriangleAlertIcon data-icon="inline-start" />
                {SCORECARD_ALERT_LABELS[a]}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            cell: (r: ScorecardRow) => (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                  <TargetIcon data-icon="inline-start" />
                  Target
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const toolbar = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect value={month} onChange={(v) => params.setFilter("month", v)} options={monthOptions} ariaLabel="Month" />
      </div>
      {data && (
        <p className="text-sm text-muted-foreground">
          Day {data.elapsedDays} of {data.days}. Collected from {data.collectedSource === "payments" ? "imported payments" : "outcomes agents recorded"}.
        </p>
      )}
    </div>
  );

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Scorecards"
          description="Ranking and monthly scorecard for every caller."
          actions={
            canManage && (
              <Button size="sm" variant="outline" disabled={exporting || !data?.items.length} onClick={() => exportFile(month)}>
                {exporting ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
                {exporting ? "Exporting…" : "Export Excel"}
              </Button>
            )
          }
        />
      }
      search={toolbar}
    >
      {isPending ? (
        <LoadingView message="Loading scorecards…" />
      ) : isError ? (
        <ErrorView message={getErrorMessage(error, "Couldn't load scorecards.")} />
      ) : data.items.length === 0 ? (
        <EntityEmptyView empty_label="No callers" message="No callers in your team yet." />
      ) : (
        <DataTable
          className={cn(isPlaceholderData && "opacity-60")}
          columns={columns}
          rows={data.items}
          getRowKey={(r) => r.agentId}
          onRowClick={(r) => router.push(`/cases?agent=${r.agentId}`)}
        />
      )}
      <SetTargetDialog row={editing} month={month} onClose={() => setEditing(null)} />
    </EntityContainer>
  );
};
