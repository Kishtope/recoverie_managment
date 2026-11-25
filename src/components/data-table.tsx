import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

/**
 * @component DataTable
 * @description Generic table that scrolls horizontally inside its own box so a wide table never scrolls the page.
 * @param columns Column definitions (header + cell renderer).
 * @param rows Data to render.
 * @param getRowKey Stable unique key per row.
 * @param onRowClick Makes rows clickable (mouse only; put a real link in a cell for keyboard users).
 * @param selection Adds a checkbox column: the selected row keys and a setter. The header checkbox selects / clears the rows on this page.
 * @param startIndex Number of rows before this page ((page - 1) * pageSize), so the S.No column keeps counting across pages. Defaults to 0.
 * @param showIndex Shows the S.No column (default). Pass false for a table where numbering makes no sense.
 */
export const DataTable = <T,>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  selection,
  startIndex = 0,
  showIndex = true,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void };
  startIndex?: number;
  showIndex?: boolean;
  className?: string;
}) => {
  const keys = rows.map(getRowKey);
  const allSelected = !!selection && keys.length > 0 && keys.every((k) => selection.selected.has(k));
  const someSelected = !!selection && keys.some((k) => selection.selected.has(k));
  // Adds or removes the given keys from the selection.
  const toggle = (ids: string[], on: boolean) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    selection.onChange(next);
  };
  return (
  <ScrollArea className={cn("w-full min-w-0 rounded-[18px] border border-border bg-card", className)}>
    <Table>
      <TableHeader>
        <TableRow>
          {selection && (
            <TableHead className="w-10">
              <Checkbox aria-label="Select all on this page" checked={allSelected} indeterminate={someSelected && !allSelected} onCheckedChange={(on) => toggle(keys, !!on)} />
            </TableHead>
          )}
          {showIndex && <TableHead className="w-14 text-center">S.No</TableHead>}
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={getRowKey(row)} className={cn(onRowClick && "cursor-pointer")} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {selection && (
              <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                <Checkbox aria-label="Select row" checked={selection.selected.has(getRowKey(row))} onCheckedChange={(on) => toggle([getRowKey(row)], !!on)} />
              </TableCell>
            )}
            {showIndex && <TableCell className="w-14 text-center tabular-nums text-muted-foreground">{startIndex + i + 1}</TableCell>}
            {columns.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {col.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
  );
};
