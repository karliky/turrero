import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Db = DatabaseSync;

export const DB_PATH = join(process.cwd(), 'data', 'turrero.db');
const MIGRATIONS_DIR = join(process.cwd(), 'data', 'migrations');

export function openDb(path: string = DB_PATH, { readOnly = false } = {}): Db {
  const db = new DatabaseSync(path, { readOnly });
  // DELETE journal mode: no -wal/-shm files next to the committed database
  if (!readOnly) db.exec('PRAGMA journal_mode = DELETE');
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

let siteDb: Db | undefined;

/** Read-only connection used by the Next.js pages and route handlers. */
export function getDb(): Db {
  siteDb ??= openDb(DB_PATH, { readOnly: true });
  return siteDb;
}

export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** Applies every data/migrations/NNNN_*.sql newer than PRAGMA user_version. Returns how many ran. */
export function migrate(db: Db): number {
  const current = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .map((file) => ({ file, version: Number(file.slice(0, 4)) }))
    .filter(({ version }) => version > current)
    .sort((a, b) => a.version - b.version);

  for (const { file, version } of pending) {
    transaction(db, () => {
      db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
      db.exec(`PRAGMA user_version = ${version}`);
    });
  }
  return pending.length;
}

/** The full-text index is derived from tweets; rebuilding ~10k rows takes milliseconds. */
export function rebuildSearch(db: Db): void {
  db.exec('DELETE FROM search');
  db.exec('INSERT INTO search (thread_id, tweet_id, text) SELECT thread_id, id, text FROM tweets');
}
