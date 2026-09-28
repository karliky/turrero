// Usage: npm run books:metadata -- [--dry-run] [--refresh]
// Fills the author of every book and the cover of books without a real one, from Open Library and
// Google Books (free, no keys; responses cached in .cache/api). Covers are resized and saved to
// public/metadata/book-<id>.jpg. Writes .cache/books-report.md to review every match by hand.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createCatalogClient, goodreadsId, realCover } from '../lib/books';
import { createFileCache } from '../lib/cache';
import { migrate, openDb } from '../lib/db';
import { listBooks } from '../lib/queries';
import { updateBookMetadata } from '../lib/store';

const MIN_COVER_SIZE = 120; // px: smaller images are catalogue placeholders
const COVER_WIDTH = 400;

const dryRun = process.argv.includes('--dry-run');
const catalog = createCatalogClient({ cache: createFileCache(undefined, { refresh: process.argv.includes('--refresh') }) });

/** Downloads and normalizes a cover; null when missing or a placeholder. */
async function saveCover(url: string, bookUrl: string): Promise<string | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const image = sharp(Buffer.from(await response.arrayBuffer()));
  const { width = 0, height = 0 } = await image.metadata();
  if (width < MIN_COVER_SIZE || height < MIN_COVER_SIZE) return null;
  const name = `book-${goodreadsId(bookUrl) ?? createHash('sha256').update(bookUrl).digest('hex').slice(0, 16)}.jpg`;
  if (!dryRun) {
    const dir = join(process.cwd(), 'public', 'metadata');
    mkdirSync(dir, { recursive: true });
    await image
      .resize({ width: COVER_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(join(dir, name));
  }
  return `/metadata/${name}`;
}

const db = openDb();
migrate(db);
const report: string[] = ['| Libro | Autor | Portada | Fuente | Coincidencia | Título encontrado |', '|---|---|---|---|---|---|'];
let authors = 0;
let covers = 0;

try {
  const books = listBooks(db);
  for (const [index, book] of books.entries()) {
    const needsCover = realCover(book.imageUrl) === null;
    if (book.author && !needsCover) continue;

    const found = await catalog.lookup(book);
    const cover = needsCover && found.coverUrl ? await saveCover(found.coverUrl, book.url) : null;
    if (!book.author && found.author) authors++;
    if (cover) covers++;
    if (!dryRun) updateBookMetadata(db, book.url, { author: book.author ? null : found.author, imageUrl: cover });

    const coverCell = needsCover ? (cover ? 'nueva' : '**sin portada**') : 'ya tenía';
    report.push(
      `| ${book.title} | ${found.author ?? '**?**'} | ${coverCell} | ${found.source ?? '—'} | ${found.score.toFixed(2)} | ${found.matchedTitle ?? '—'} |`,
    );
    process.stdout.write(`\r${index + 1}/${books.length}`);
  }
} finally {
  if (!dryRun) db.exec('VACUUM');
  db.close();
}

mkdirSync(join(process.cwd(), '.cache'), { recursive: true });
writeFileSync(join(process.cwd(), '.cache', 'books-report.md'), `${report.join('\n')}\n`);
console.log(`\n${authors} authors and ${covers} covers ${dryRun ? 'found (dry run)' : 'saved'} → .cache/books-report.md`);
