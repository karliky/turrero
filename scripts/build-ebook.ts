// Usage: npm run ebook — writes public/ebook/el-turrero-post.epub (also run by npm run build)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { openDb } from '../lib/db';
import { buildEpub, collectImageSources, escapeXml, type ImageSource } from '../lib/ebook';
import { getThread, listThreadIds } from '../lib/queries';
import { SITE } from '../lib/site';

const OUTPUT_DIR = join(process.cwd(), 'public', 'ebook');
const OUTPUT_FILE = 'el-turrero-post.epub';
const CACHE_DIR = join(process.cwd(), '.cache', 'ebook-images');
const MAX_BYTES = 60 * 1024 * 1024;
const CONCURRENCY = 8;

// Small, compressed images are enough on e-readers and keep the book light
const IMAGE_SETTINGS = {
  photo: { size: 600, quality: 50 },
  frame: { size: 360, quality: 45 },
} as const;

async function readSource(src: string): Promise<Buffer> {
  if (src.startsWith('/')) return readFileSync(join(process.cwd(), 'public', src));
  // Remote images (pbs.twimg.com) are downloaded once and kept in the cache
  const cached = join(CACHE_DIR, 'source', createHash('sha1').update(src).digest('hex'));
  if (existsSync(cached)) return readFileSync(cached);
  const response = await fetch(src);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(join(CACHE_DIR, 'source'), { recursive: true });
  writeFileSync(cached, bytes);
  return bytes;
}

async function processImage({ src, kind }: ImageSource): Promise<Uint8Array | null> {
  const { size, quality } = IMAGE_SETTINGS[kind];
  const cached = join(CACHE_DIR, 'processed', `${createHash('sha1').update(`${src}|${size}|${quality}`).digest('hex')}.jpg`);
  if (existsSync(cached)) return readFileSync(cached);
  try {
    const output = await sharp(await readSource(src), { animated: false })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true, progressive: false })
      .toBuffer();
    mkdirSync(join(CACHE_DIR, 'processed'), { recursive: true });
    writeFileSync(cached, output);
    return output;
  } catch (error) {
    console.warn(`  skipped image ${src}: ${(error as Error).message}`);
    return null;
  }
}

async function processAll(sources: ImageSource[]): Promise<Map<string, Uint8Array>> {
  const images = new Map<string, Uint8Array>();
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < sources.length) {
        const source = sources[next++]!;
        const bytes = await processImage(source);
        if (bytes) images.set(source.src, bytes);
      }
    }),
  );
  return images;
}

/** Word wrap for SVG text, which has no automatic line breaks. */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

async function renderCover(threads: number, lastYear: string): Promise<Uint8Array> {
  const subtitle = wrap(`Las turras de ${SITE.byline}`, 34)
    .map((line, i) => `<tspan x="200" dy="${i === 0 ? 0 : 90}">${escapeXml(line)}</tspan>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2560">
  <rect width="1600" height="2560" fill="#f9f6f3"/>
  <rect width="80" height="2560" fill="#9b2335"/>
  <text x="200" y="900" font-family="Georgia, serif" font-size="150" font-weight="bold" fill="#301e1a">El</text>
  <text x="200" y="1080" font-family="Georgia, serif" font-size="170" font-weight="bold" fill="#9b2335">Turrero Post</text>
  <text x="200" y="1300" font-family="Georgia, serif" font-size="72" fill="#5b3b33">${subtitle}</text>
  <text x="200" y="2300" font-family="Georgia, serif" font-size="56" fill="#895645">${threads} turras · edición ${lastYear}</text>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
}

const started = Date.now();
const db = openDb(undefined, { readOnly: true });
const threads = listThreadIds(db)
  .reverse() // oldest first
  .map((id) => getThread(id, db)!);
db.close();

const sources = collectImageSources(threads);
const images = await processAll(sources);
const now = new Date();
const cover = await renderCover(threads.length, now.getFullYear().toString());
const { bytes, stats } = buildEpub({ threads, images, cover, now });

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, OUTPUT_FILE), bytes);
writeFileSync(
  join(OUTPUT_DIR, 'info.json'),
  JSON.stringify({
    file: `/ebook/${OUTPUT_FILE}`,
    bytes: bytes.length,
    threads: stats.threads,
    firstPublishedAt: threads[0]?.publishedAt ?? null,
    lastPublishedAt: threads.at(-1)?.publishedAt ?? null,
    generatedAt: now.toISOString(),
  }),
);

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(
  `Ebook: ${stats.threads} turras, ${stats.images} images (${sources.length - images.size} unavailable, ` +
    `${images.size - stats.images} duplicates merged), images ${mb(stats.imageBytes)}, total ${mb(bytes.length)} ` +
    `in ${((Date.now() - started) / 1000).toFixed(0)}s → public/ebook/${OUTPUT_FILE}`,
);
if (bytes.length > MAX_BYTES) {
  console.error(`The ebook exceeds the ${mb(MAX_BYTES)} budget; lower IMAGE_SETTINGS in scripts/build-ebook.ts`);
  process.exit(1);
}
