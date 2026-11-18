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
 */
export const DataTable = <T,>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  selection,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void };
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
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={getRowKey(row)} className={cn(onRowClick && "cursor-pointer")} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {selection && (
              <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                <Checkbox aria-label="Select row" checked={selection.selected.has(getRowKey(row))} onCheckedChange={(on) => toggle([getRowKey(row)], !!on)} />
              </TableCell>
            )}
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
