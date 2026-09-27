// Usage: npm run turra:enrich -- <thread id>
import { createOpenAiEnricher } from '../lib/ai';
import { openDb } from '../lib/db';
import { loadEnv, requireEnv } from '../lib/env';
import { enrichTurra } from '../lib/ingest';

loadEnv();
const threadId = process.argv[2];
if (!threadId) {
  console.error('Usage: npm run turra:enrich -- <thread id>');
  process.exit(1);
}

requireEnv('OPENAI_API_KEY');
const db = openDb();
try {
  await enrichTurra(db, threadId, createOpenAiEnricher());
  console.log(`Enriched turra ${threadId}`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  db.exec('VACUUM');
  db.close();
}
