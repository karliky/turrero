// Usage: npm run turra:discover -- [--author Recuenco] [--since YYYY-MM-DD] [--add]
// Finds the author's Saturday threads published after its latest archived turra; --add imports them.
import { parseArgs } from 'node:util';
import { createOpenAiEnricher } from '../lib/ai';
import { createFileCache } from '../lib/cache';
import { openDb } from '../lib/db';
import { findTurras } from '../lib/discover';
import { loadEnv } from '../lib/env';
import { addTurra } from '../lib/ingest';
import { SITE } from '../lib/site';
import { createXClientFromEnv } from '../lib/x';

loadEnv();
const { values } = parseArgs({
  options: {
    author: { type: 'string', default: SITE.featuredAuthor },
    since: { type: 'string' },
    add: { type: 'boolean', default: false },
  },
});

const cache = createFileCache();
const db = openDb();
try {
  const x = await createXClientFromEnv(cache);
  const candidates = await findTurras(db, x, {
    handle: values.author,
    ...(values.since ? { since: new Date(`${values.since}T00:00:00Z`) } : {}),
  });

  for (const c of candidates) {
    const status = c.rejection ? `skip (${c.rejection})` : 'TURRA';
    console.log(`${c.publishedAt.slice(0, 16)}  ${c.id}  ${String(c.tweets ?? '-').padStart(3)} tweets  ${status}  ${c.firstLine}`);
  }
  const turras = candidates.filter((c) => !c.rejection);
  console.log(`\n${turras.length} turra(s) to import out of ${candidates.length} post(s) found.`);

  if (values.add) {
    for (const turra of turras) {
      const result = await addTurra(db, turra.id, x, process.env.OPENAI_API_KEY ? createOpenAiEnricher({ cache }) : null);
      result.warnings.forEach((warning) => console.warn(`  warning (${turra.id}): ${warning}`));
      console.log(`Added ${result.threadId} (${result.tweets} tweets${result.enriched ? ', enriched with AI' : ''})`);
    }
  } else if (turras.length > 0) {
    console.log('Run again with --add to import them.');
  }
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  db.exec('VACUUM');
  db.close();
}
