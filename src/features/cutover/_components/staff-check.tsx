"use client";

import { useRef, useState } from "react";
import { FileSearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useCheckStaff } from "../hooks/use-cutover";
import type { StaffMatch } from "../types";

// How each result reads and looks: only "matched" is good news.
const RESULT: Record<StaffMatch["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  matched: { label: "Has an account", variant: "default", className: "bg-success text-success-foreground" },
  "no-account": { label: "No account", variant: "destructive" },
  disabled: { label: "Disabled", variant: "secondary" },
  ambiguous: { label: "Several people with this name", variant: "outline" },
};

// Columns of the result table; the name cell shows the role the old sheet gave, the last column who the row was matched to.
const columns: DataTableColumn<StaffMatch>[] = [
  { key: "row", header: "Row", cell: (m) => m.row },
  {
    key: "name",
    header: "Old staff",
    cell: (m) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{m.name || "-"}</div>
        <div className="truncate text-xs text-muted-foreground">{[m.mobile, m.role].filter(Boolean).join(" · ") || "-"}</div>
      </div>
    ),
  },
  { key: "status", header: "Result", cell: (m) => <Badge variant={RESULT[m.status].variant} className={RESULT[m.status].className}>{RESULT[m.status].label}</Badge> },
  { key: "user", header: "Matched user", cell: (m) => (m.user ? `${m.user.name} (by ${m.matchedBy})` : "-") },
];

/**
 * @component StaffCheck
 * @description Admin tool for the cut-over: upload the old site's staff list and see, row by row, who already has an account in the app, who
 * needs one, who is disabled and who is ambiguous. Read-only (nothing is saved), so it can be run as often as needed while users are fixed.
 */
export const StaffCheck = () => {
  const { mutate, isPending, data } = useCheckStaff();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rows that need action come first so they are seen without scrolling.
  const items = data ? [...data.items].sort((a, b) => Number(a.status === "matched") - Number(b.status === "matched") || a.row - b.row) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check the old staff list</CardTitle>
        <CardDescription>Upload the staff list from the old site as .xlsx or .csv with a Name column (Mobile and Role help). Nothing is saved.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input ref={inputRef} type="file" accept=".xlsx,.csv" aria-label="Old staff file" className="max-w-sm" disabled={isPending} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button disabled={!file || isPending} onClick={() => file && mutate(file)}>
            {isPending ? <Spinner data-icon="inline-start" /> : <FileSearchIcon data-icon="inline-start" />}
            {isPending ? "Checking…" : "Check list"}
          </Button>
        </div>
        {data && (
          <>
            <p className="text-sm text-muted-foreground">
              {data.summary.total} rows: {data.summary.matched} have an account, {data.summary.noAccount} need one, {data.summary.disabled} disabled, {data.summary.ambiguous} to decide by hand.
            </p>
            <DataTable columns={columns} rows={items} getRowKey={(m) => String(m.row)} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
