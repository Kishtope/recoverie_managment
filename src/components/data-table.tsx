import type { ReactNode } from "react";
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
 */
export const DataTable = <T,>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}) => (
  <ScrollArea className={cn("w-full min-w-0 rounded-[18px] border border-border bg-card", className)}>
    <Table>
      <TableHeader>
        <TableRow>
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
