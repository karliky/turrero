// Usage: npx tsx scripts/categorize-export.ts [batches=9]      (turras)
//        npx tsx scripts/categorize-export.ts --books [batches=4] (books)
// Read-only: dumps every turra as Markdown to .cache/categorize/corpus/<id>.md and splits them into
// batches of similar size (.cache/categorize/batches.json) for the categorization agents. With --books,
// writes .cache/categorize/books-batches.json: title, author and the tweets that cite each book.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../lib/db';
import { getThread, listBooks, listThreadIds } from '../lib/queries';

const OUT_DIR = join(process.cwd(), '.cache', 'categorize');
const CORPUS_DIR = join(OUT_DIR, 'corpus');
const books = process.argv.includes('--books');
const batchCount = Number(process.argv.find((arg) => /^\d+$/.test(arg)) ?? (books ? 4 : 9));

const db = openDb(undefined, { readOnly: true });

if (books) {
  const tweetText = db.prepare('SELECT text FROM tweets WHERE id = ?');
  const entries = listBooks(db).map((book) => ({
    url: book.url,
    title: book.title,
    author: book.author,
    citedIn: book.mentions.map((m) => (tweetText.get(m.tweetId) as { text: string } | undefined)?.text.slice(0, 500) ?? ''),
  }));
  const size = Math.ceil(entries.length / batchCount);
  const batches = Array.from({ length: batchCount }, (_, i) => entries.slice(i * size, (i + 1) * size));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'books-batches.json'), JSON.stringify(batches, null, 1));
  console.log(`${entries.length} books in ${batchCount} batches → ${join(OUT_DIR, 'books-batches.json')}`);
  db.close();
  process.exit(0);
}
const files = listThreadIds(db)
  .reverse() // oldest first
  .map((id) => {
    const thread = getThread(id, db)!;
    const body = thread.tweets
      .map((tweet) => [tweet.text, tweet.quote && `> Cita de @${tweet.quote.authorHandle ?? '?'}: ${tweet.quote.text}`].filter(Boolean).join('\n'))
      .join('\n\n');
    const markdown = `# ${thread.title}\n\nid: ${thread.id} · autor: @${thread.author.handle} · fecha: ${thread.publishedAt.slice(0, 10)}\n\n${body}\n`;
    return { id, markdown };
  });
db.close();

mkdirSync(CORPUS_DIR, { recursive: true });
for (const { id, markdown } of files) writeFileSync(join(CORPUS_DIR, `${id}.md`), markdown);

// Greedy balancing: largest turras first, each into the lightest batch
const batches = Array.from({ length: batchCount }, () => ({ ids: [] as string[], chars: 0 }));
for (const file of [...files].sort((a, b) => b.markdown.length - a.markdown.length)) {
  const lightest = batches.reduce((min, batch) => (batch.chars < min.chars ? batch : min));
  lightest.ids.push(file.id);
  lightest.chars += file.markdown.length;
}
const order = new Map(files.map((file, index) => [file.id, index]));
for (const batch of batches) batch.ids.sort((a, b) => order.get(a)! - order.get(b)!);
writeFileSync(join(OUT_DIR, 'batches.json'), JSON.stringify(batches.map((b) => b.ids), null, 2));

console.log(`${files.length} turras → ${CORPUS_DIR}`);
console.log(batches.map((b, i) => `  lote ${i + 1}: ${b.ids.length} turras, ${(b.chars / 1000).toFixed(0)}k caracteres`).join('\n'));
