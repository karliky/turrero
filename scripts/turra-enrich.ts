// Usage: npm run turra:enrich -- <thread id> [--refresh]
import { createOpenAiEnricher } from '../lib/ai';
import { createFileCache } from '../lib/cache';
import { openDb } from '../lib/db';
import { loadEnv, requireEnv } from '../lib/env';
import { enrichTurra } from '../lib/ingest';

loadEnv();
const threadId = process.argv[2];
if (!threadId) {
  console.error('Usage: npm run turra:enrich -- <thread id> [--refresh]');
  process.exit(1);
}

requireEnv('OPENAI_API_KEY');
const db = openDb();
try {
  const cache = createFileCache(undefined, { refresh: process.argv.includes('--refresh') });
  await enrichTurra(db, threadId, createOpenAiEnricher({ cache }));
  console.log(`Enriched turra ${threadId}`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  db.exec('VACUUM');
  db.close();
}
