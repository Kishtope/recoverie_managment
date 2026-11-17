import "dotenv/config";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { backupFileName, filesToDelete } from "../src/lib/backup";

// Backs up the whole database: `bun scripts/backup-db.ts`. Runs mysqldump with the DB_* settings from .env, compresses the dump into
// BACKUP_DIR (default "backups/") as recoverie-yyyyMMdd-HHmmss.sql.gz, then removes our own backups older than BACKUP_KEEP_DAYS (default 14).
// The password goes in the environment (MYSQL_PWD), never on the command line. A failed dump leaves no half-written file and exits non-zero.
// TODO: decide who runs this every night (Windows Task Scheduler or the host's scheduler) and who copies the file to a second place.
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const dir = process.env.BACKUP_DIR || "backups";
const keepDays = Number(process.env.BACKUP_KEEP_DAYS ?? 14);
const mysqldump = process.env.MYSQLDUMP_PATH || "mysqldump";

const run = async () => {
  if (!DB_HOST || !DB_USER || !DB_NAME) throw new Error("DB_HOST, DB_USER and DB_NAME must be set in .env");
  if (!Number.isFinite(keepDays) || keepDays < 0) throw new Error("BACKUP_KEEP_DAYS must be a number of days (0 or more)");

  await mkdir(dir, { recursive: true });
  const file = join(dir, backupFileName(new Date()));
  const args = ["-h", DB_HOST, "-P", DB_PORT || "3306", "-u", DB_USER, "--single-transaction", "--routines", "--no-tablespaces", DB_NAME];
  const child = spawn(mysqldump, args, { env: { ...process.env, MYSQL_PWD: DB_PASSWORD ?? "" }, stdio: ["ignore", "pipe", "pipe"] });

  // Collect mysqldump's own complaints so a failure says why (they never contain the password).
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const exited = new Promise<number>((resolve, reject) => {
    child.on("error", (e) => reject(new Error(`Could not start "${mysqldump}" (${e.message}). Install the MySQL client tools or set MYSQLDUMP_PATH.`)));
    child.on("close", (code) => resolve(code ?? 1));
  });

  try {
    await Promise.all([pipeline(child.stdout, createGzip(), createWriteStream(file)), exited.then((code) => {
      if (code !== 0) throw new Error(`mysqldump failed (exit ${code}): ${stderr.trim().split("\n").pop() ?? ""}`);
    })]);
  } catch (error) {
    await rm(file, { force: true });
    throw error;
  }
  console.log(`Backup written: ${file}`);

  const old = filesToDelete(await readdir(dir), new Date(), keepDays);
  for (const name of old) await rm(join(dir, name));
  if (old.length) console.log(`Removed ${old.length} backup(s) older than ${keepDays} days.`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
