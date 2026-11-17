import type { Prisma } from "@/generated/prisma/client";
import type { ImportRowError } from "@/features/imports/types";
import { prisma } from "@/lib/prisma";

// What happened to one row (or planned change) when it was written.
export type Outcome = "created" | "updated" | "unchanged";

// Totals of a write pass, plus the rows that failed.
export type ApplyResult = { created: number; updated: number; unchanged: number; errors: ImportRowError[] };

// Splits a list into pieces of at most `size`.
export const chunk = <T>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

// Runs an async step over items one after another inside a transaction (queries on one connection must not overlap).
export const sequential = async <T, R>(items: T[], step: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = [];
  for (const item of items) out.push(await step(item));
  return out;
};

// Last line of a database error, which is the readable part of Prisma's message.
const readableError = (e: unknown) => (e instanceof Error ? e.message.trim().split("\n").pop()!.trim() : "Could not save this row");

// Writes items in chunks, one transaction per chunk, so a loader can batch its queries across the chunk.
// If a chunk fails it is retried one row at a time so only the bad rows end up in the error report and the rest still import.
// `describe` gives the agreement no. shown next to an error.
export const applyInChunks = async <T extends { row: number }>(
  items: T[],
  applyChunk: (tx: Prisma.TransactionClient, items: T[]) => Promise<Outcome[]>,
  describe: (item: T) => string | null,
  size = 500,
): Promise<ApplyResult> => {
  const result: ApplyResult = { created: 0, updated: 0, unchanged: 0, errors: [] };
  const tally = (outcome: Outcome) => void (result[outcome] += 1);

  for (const part of chunk(items, size)) {
    try {
      (await prisma.$transaction((tx) => applyChunk(tx, part), { timeout: 60_000 })).forEach(tally);
    } catch {
      for (const item of part) {
        try {
          (await prisma.$transaction((tx) => applyChunk(tx, [item]))).forEach(tally);
        } catch (e) {
          result.errors.push({ row: item.row, agreementNo: describe(item), reason: readableError(e) });
        }
      }
    }
  }
  return result;
};
