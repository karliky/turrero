// Usage: npm run turra:sync -- <thread id> [--delete-missing]
import { openDb } from '../lib/db';
import { loadEnv, requireEnv } from '../lib/env';
import { syncTurra } from '../lib/ingest';
import { createXClient } from '../lib/x';

loadEnv();
const threadId = process.argv[2];
if (!threadId) {
  console.error('Usage: npm run turra:sync -- <thread id> [--delete-missing]');
  process.exit(1);
}

const x = createXClient({ bearerToken: requireEnv('X_API_BEARER_TOKEN') });
const db = openDb();
try {
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
