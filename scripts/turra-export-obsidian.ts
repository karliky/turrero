// Usage: npm run turra:export-obsidian -- --out <folder> [--id <thread id>] [--overwrite]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { openDb } from '../lib/db';
import { obsidianFileName, renderObsidianNote } from '../lib/obsidian';
import { getThread, listThreadIds } from '../lib/queries';

const { values } = parseArgs({
  options: { out: { type: 'string' }, id: { type: 'string' }, overwrite: { type: 'boolean', default: false } },
});
if (!values.out) {
  console.error('Usage: npm run turra:export-obsidian -- --out <folder> [--id <thread id>] [--overwrite]');
  process.exit(1);
}

const db = openDb(undefined, { readOnly: true });
const ids = values.id ? [values.id] : listThreadIds(db);
mkdirSync(values.out, { recursive: true });

let written = 0;
for (const id of ids) {
  const thread = getThread(id, db);
  if (!thread) {
    console.error(`Unknown turra ${id}`);
    process.exitCode = 1;
    continue;
  }
  const file = join(values.out, obsidianFileName(thread));
  if (existsSync(file) && !values.overwrite) continue;
  writeFileSync(file, renderObsidianNote(thread));
  written++;
}
console.log(`Wrote ${written} note(s) to ${values.out}`);
