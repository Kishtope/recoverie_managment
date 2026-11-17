// One CSV cell: wrapped in quotes when it holds a comma, quote or line break (quotes doubled). A cell that would be read as a formula by a
// spreadsheet (starts with = + - @) gets a leading apostrophe-free guard of a single space, so an exported name can never run as one.
const cell = (value: string | number | null | undefined) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text) && typeof value === "string") text = ` ${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Rows of cells as CSV text (header row first, if the caller includes one), with a BOM so Excel reads UTF-8 names correctly.
export const toCsv = (rows: (string | number | null | undefined)[][]) => `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
