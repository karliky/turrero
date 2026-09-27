// Usage: npm run turra:add -- <x.com status URL | tweet id>
import { createOpenAiEnricher } from '../lib/ai';
import { createFileCache } from '../lib/cache';
import { openDb } from '../lib/db';
import { loadEnv } from '../lib/env';
import { addTurra } from '../lib/ingest';
import { createXClientFromEnv } from '../lib/x';

loadEnv();
const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run turra:add -- <x.com status URL | tweet id>');
  process.exit(1);
}

const cache = createFileCache();
const enrich = process.env.OPENAI_API_KEY ? createOpenAiEnricher({ cache }) : null;
const db = openDb();
try {
  const x = await createXClientFromEnv(cache);
  const result = await addTurra(db, input, x, enrich);
  result.warnings.forEach((warning) => console.warn(`warning: ${warning}`));
  console.log(`Added turra ${result.threadId} (${result.tweets} tweets${result.enriched ? ', enriched with AI' : ''})`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  db.exec('VACUUM');
  db.close();
}
