// Cell-value parsers shared by the import row schemas. Each returns null when the text is not valid (blank is handled by the caller).

// Turns a hub date cell into a UTC-midnight Date. Accepts yyyy-MM-dd, dd-MM-yyyy, dd/MM/yyyy, dd.MM.yyyy and Excel serial numbers.
export const parseHubDate = (raw: string): Date | null => {
  const text = raw.trim();
  let y: number, m: number, d: number;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(text);
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else if (/^\d{4,6}(\.\d+)?$/.test(text)) {
    // Excel serial day count (1899-12-30 is day 0 once the 1900 leap-year bug is accounted for).
    const serial = Math.floor(Number(text));
    if (serial < 20000 || serial > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
  } else return null;

  const date = new Date(Date.UTC(y, m - 1, d));
  // Round-trip check rejects 31 Feb and similar rolled-over dates.
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
};

// Parses an amount such as "1,23,456.50" (Indian grouping) or "₹ 5000"; null when it is not a number.
export const parseAmount = (raw: string): number | null => {
  const n = Number(raw.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Keeps the 10 digits of an Indian mobile number (drops +91 / 0 prefixes, spaces, dashes); null when it does not fit.
export const parseMobile = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^\d{10}$/.test(ten) ? ten : null;
};
