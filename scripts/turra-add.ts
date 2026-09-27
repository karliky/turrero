// Usage: npm run turra:add -- <x.com status URL | tweet id>
import { createOpenAiEnricher } from '../lib/ai';
import { openDb } from '../lib/db';
import { loadEnv, requireEnv } from '../lib/env';
import { addTurra } from '../lib/ingest';
import { createXClient } from '../lib/x';

loadEnv();
const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run turra:add -- <x.com status URL | tweet id>');
  process.exit(1);
}

const x = createXClient({ bearerToken: requireEnv('X_API_BEARER_TOKEN') });
const enrich = process.env.OPENAI_API_KEY ? createOpenAiEnricher() : null;
const db = openDb();
try {
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
