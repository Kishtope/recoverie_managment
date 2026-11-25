import { TriangleAlertIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ImportRowError } from "../types";

// One kind of problem and every row that has it.
type ErrorGroup = { key: string; title: string; column?: string; rows: { error: ImportRowError; detail: string }[] };

// The problem without the parts that change per row (quoted values, the retailer code), so "Retailer KPD223 can take only 20…" and
// "Retailer KPD643 can take only 20…" fall into one group.
const problemOf = (reason: string) =>
  reason
    .replace(/\(first on row \d+\)/, "")
    .replace(/^Retailer (?!Code)\S+ /, "A retailer ")
    .replace(/"[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .replace(/ ([.;,])/g, "$1")
    .trim();

// The part that was removed above (the retailer code, the bad value, the earlier row), shown as the row's detail.
const detailOf = (reason: string) =>
  /^Retailer (?!Code)(\S+) /.exec(reason)?.[1] ?? /"([^"]*)"/.exec(reason)?.[1] ?? (/\(first on row (\d+)\)/.exec(reason) ? `first on row ${/\(first on row (\d+)\)/.exec(reason)?.[1]}` : "");

// Groups the errors by column and problem, biggest group first.
export const groupErrors = (errors: ImportRowError[]): ErrorGroup[] => {
  const groups = new Map<string, ErrorGroup>();
  for (const error of errors) {
    const column = error.column?.replace(/ \(column [A-Z]+\)$/, "");
    const title = problemOf(error.reason);
    const key = `${column ?? ""}|${title}`;
    const group = groups.get(key) ?? { key, title, column: error.column, rows: [] };
    group.rows.push({ error, detail: detailOf(error.reason) });
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.rows.length - a.rows.length);
};

// Groups with more rows than this scroll inside a fixed-height box instead of growing the dialog.
const SCROLL_AFTER_ROWS = 6;

/**
 * @component ImportErrorList
 * @description Rejected rows of an upload check, grouped by problem: a summary line, then one expandable item per kind of problem showing the
 * column it is in, how many rows it affects and the rows themselves. Replaces a long flat list so the Admin sees what to fix first.
 * @param errors The rejected rows (the first ones when the file has very many).
 * @param total How many rows are invalid in all; a note appears when `errors` holds fewer.
 */
export const ImportErrorList = ({ errors, total, className }: { errors: ImportRowError[]; total: number; className?: string }) => {
  const groups = groupErrors(errors);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>{total.toLocaleString("en-IN")} {total === 1 ? "row has a problem" : "rows have problems"} and will be skipped</AlertTitle>
        <AlertDescription>Fix them in the file and upload again, or upload now to save only the valid rows.</AlertDescription>
      </Alert>
      <Accordion className="rounded-[18px] border border-border px-4">
        {groups.map((g) => (
          <AccordionItem key={g.key} value={g.key}>
            <AccordionTrigger className="hover:no-underline">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="text-sm font-medium">{g.title}</span>
                {g.column && <span className="text-xs font-normal text-muted-foreground">{g.column}</span>}
              </span>
              <Badge variant="destructive" className="shrink-0">
                {g.rows.length.toLocaleString("en-IN")} {g.rows.length === 1 ? "row" : "rows"}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              {/* A fixed height (not a max height) so the viewport has something to overflow and the mouse wheel scrolls it. */}
              <ScrollArea className={cn("rounded-[18px] border border-border", g.rows.length > SCROLL_AFTER_ROWS && "h-56")}>
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Loan account no.</TableHead>
                      {g.rows.some((r) => r.detail) && <TableHead>Value</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.rows.map(({ error, detail }) => (
                      <TableRow key={error.row}>
                        <TableCell className="tabular-nums">{error.row}</TableCell>
                        <TableCell>{error.agreementNo || "-"}</TableCell>
                        {g.rows.some((r) => r.detail) && <TableCell>{detail || "-"}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {total > errors.length && <p className="text-xs text-muted-foreground">Showing the first {errors.length.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")} rows.</p>}
    </div>
  );
};
