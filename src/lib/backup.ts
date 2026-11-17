// Backup files are named recoverie-yyyyMMdd-HHmmss.sql.gz (UTC). Only files with exactly this name are ever considered for deletion,
// so a stray file in the backup folder (notes, a manual copy) can never be removed by the cleanup.
const BACKUP_NAME = /^recoverie-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.sql\.gz$/;

// "recoverie-20261117-100000.sql.gz" for a moment in time.
export const backupFileName = (now: Date) => `recoverie-${now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)}.sql.gz`;

// The moment a backup file name stands for, or null when the name is not one of ours.
export const backupTime = (name: string) => {
  const m = BACKUP_NAME.exec(name);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : null;
};

// Which of the files in the backup folder are old enough to delete: our own backups older than `keepDays` days. Everything else is kept.
export const filesToDelete = (names: string[], now: Date, keepDays: number) =>
  names.filter((name) => {
    const at = backupTime(name);
    return at !== null && now.getTime() - at.getTime() > keepDays * 24 * 3600_000;
  });
