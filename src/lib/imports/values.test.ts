import { expect, test } from "bun:test";
import { parseAmount, parseHubDate, parseMobile } from "./values";

const ymd = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

test("dates: iso, dd-MM-yyyy, dd/MM/yyyy and Excel serial", () => {
  expect(ymd(parseHubDate("2024-03-15"))).toBe("2024-03-15");
  expect(ymd(parseHubDate("15-03-2024"))).toBe("2024-03-15");
  expect(ymd(parseHubDate("05/01/2024"))).toBe("2024-01-05"); // day first, never US order
  expect(ymd(parseHubDate("45366"))).toBe("2024-03-15");
});

test("dates: impossible or unknown formats are rejected, not guessed", () => {
  expect(parseHubDate("31/02/2024")).toBeNull();
  expect(parseHubDate("March 15")).toBeNull();
  expect(parseHubDate("12")).toBeNull();
});

test("amounts with Indian grouping and rupee sign", () => {
  expect(parseAmount("1,23,456.50")).toBe(123456.5);
  expect(parseAmount("₹ 5000")).toBe(5000);
  expect(parseAmount("abc")).toBeNull();
});

test("mobile keeps 10 digits, drops +91 and 0 prefixes", () => {
  expect(parseMobile("+91 98123-45621")).toBe("9812345621");
  expect(parseMobile("09812345621")).toBe("9812345621");
  expect(parseMobile("12345")).toBeNull();
});
