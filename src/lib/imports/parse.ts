import { Readable } from "node:stream";
import ExcelJS from "exceljs";

// Upload limits from the Phase 1 plan.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 50_000;

// A problem with the file itself (wrong type, too big, empty); the API turns it into a 400.
export class ImportFileError extends Error {}

// One sheet as text: the header row plus data rows (blank rows dropped). `row` is the 1-based spreadsheet row.
export type ParsedSheet = { headers: string[]; rows: { row: number; cells: string[] }[] };

// Flattens an ExcelJS cell value (formula, rich text, hyperlink, date...) into plain trimmed text.
const cellText = (value: ExcelJS.CellValue | undefined): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("richText" in value) return value.richText.map((t) => t.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    return ""; // error cells such as #N/A
  }
  return String(value).trim();
};

// Reads the first sheet of an .xlsx or .csv upload. CSV cells stay raw text (no number/date guessing, so "05-01-2024" is not read as US format).
export const parseSheet = async (buffer: Buffer, fileName: string): Promise<ParsedSheet> => {
  if (buffer.length > MAX_FILE_BYTES) throw new ImportFileError("File is larger than 10 MB");
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext !== "xlsx" && ext !== "csv") throw new ImportFileError("Upload an .xlsx or .csv file");

  const workbook = new ExcelJS.Workbook();
  let sheet: ExcelJS.Worksheet | undefined;
  try {
    if (ext === "csv") sheet = await workbook.csv.read(Readable.from(buffer), { map: (value: string) => value });
    else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      sheet = workbook.worksheets[0];
    }
  } catch {
    throw new ImportFileError("Couldn't read the file. Is it a valid .xlsx or .csv?");
  }
  if (!sheet || sheet.rowCount < 2) throw new ImportFileError("The file has no data rows");
  if (sheet.rowCount - 1 > MAX_ROWS) throw new ImportFileError(`The file has more than ${MAX_ROWS.toLocaleString("en-IN")} rows`);

  const width = sheet.columnCount;
  const read = (n: number) => Array.from({ length: width }, (_, c) => cellText(sheet.getRow(n).getCell(c + 1).value));
  const headers = read(1);
  const rows: ParsedSheet["rows"] = [];
  for (let n = 2; n <= sheet.rowCount; n++) {
    const cells = read(n);
    if (cells.some(Boolean)) rows.push({ row: n, cells });
  }
  if (!rows.length) throw new ImportFileError("The file has no data rows");
  return { headers, rows };
};
