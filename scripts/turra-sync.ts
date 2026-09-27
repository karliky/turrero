// Usage: npm run turra:sync -- <thread id> [--delete-missing]
import { createFileCache } from '../lib/cache';
import { openDb } from '../lib/db';
import { loadEnv } from '../lib/env';
import { syncTurra } from '../lib/ingest';
import { createXClientFromEnv } from '../lib/x';

loadEnv();
const threadId = process.argv[2];
if (!threadId) {
  console.error('Usage: npm run turra:sync -- <thread id> [--delete-missing]');
  process.exit(1);
}

const db = openDb();
try {
  // Syncing is about fresh data: skip cached responses, but store the new ones
  const x = await createXClientFromEnv(createFileCache(undefined, { refresh: true }));
  const result = await syncTurra(db, threadId, x, { deleteMissing: process.argv.includes('--delete-missing') });
  result.warnings.forEach((warning) => console.warn(`warning: ${warning}`));
  console.log(result.deleted ? `Deleted turra ${threadId} (no longer on X)` : `Synced turra ${threadId} (${result.tweets} tweets)`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  db.exec('VACUUM');
  db.close();
}
