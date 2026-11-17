import { expect, test } from "bun:test";
import { backupFileName, backupTime, filesToDelete } from "./backup";

const now = new Date("2026-11-17T10:00:00Z");

test("file names follow the pattern and read back to the same moment", () => {
  const name = backupFileName(new Date("2026-11-17T09:05:07Z"));
  expect(name).toBe("recoverie-20261117-090507.sql.gz");
  expect(backupTime(name)?.toISOString()).toBe("2026-11-17T09:05:07.000Z");
  expect(backupTime("notes.txt")).toBeNull();
  expect(backupTime("recoverie-2026-11-17.sql.gz")).toBeNull();
});

test("only our own backups older than the keep period are deleted", () => {
  const names = [
    "recoverie-20261101-020000.sql.gz", // 16 days old
    "recoverie-20261103-020000.sql.gz", // 14 days old, 8 hours: older than 14 days
    "recoverie-20261104-020000.sql.gz", // 13 days old
    "recoverie-20261117-020000.sql.gz", // today
    "notes.txt", // not ours, however old
    "recoverie-manual-copy.sql.gz", // not our pattern
    "recoverie-20200101-000000.sql", // not gzipped, not ours
  ];
  expect(filesToDelete(names, now, 14)).toEqual(["recoverie-20261101-020000.sql.gz", "recoverie-20261103-020000.sql.gz"]);
  expect(filesToDelete(names, now, 365)).toEqual([]);
});

test("keeping 0 days deletes every backup of ours but nothing else", () => {
  expect(filesToDelete(["recoverie-20261117-090000.sql.gz", "readme.md"], now, 0)).toEqual(["recoverie-20261117-090000.sql.gz"]);
});
