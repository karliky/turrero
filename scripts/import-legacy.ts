// One-off migration: legacy JSON/CSV files (infrastructure/db) -> canonical SQLite database.
// Usage: npm run db:import-legacy
import { existsSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate, openDb, rebuildSearch, transaction, type Db } from '../lib/db';
import { insertThread, replaceTweets, setThreadCategories, upsertAuthor, upsertBook } from '../lib/store';
import { parseCount, slugify, snowflakeTime } from '../lib/text';
import type { ExamQuestion, Link, Media, Quote, Tweet, TweetStats } from '../lib/types';

// ---------------------------------------------------------------------------
// Legacy shapes (only the fields we read)
// ---------------------------------------------------------------------------

interface LegacyImg { img: string; url: string; video?: string }
interface LegacyEmbed { id: string; author: string; tweet: string; url?: string; img?: string; video?: string }
interface LegacyTweet {
  id: string;
  tweet: string;
  time: string;
  author: string;
  authorName?: string;
  stats: Record<string, string>;
  metadata?: {
    type?: string;
    imgs?: LegacyImg[];
    img?: string;
    url?: string;
    title?: string;
    domain?: string;
    media?: string;
    embed?: LegacyEmbed;
  };
}
interface LegacyEnriched {
  id: string;
  type: 'card' | 'media' | 'image' | 'embed';
  url?: string;
  img?: string;
  video?: string;
  domain?: string;
  title?: string;
  caption?: string;
  description?: string;
  media?: string;
  embeddedTweetId?: string;
  author?: string;
  tweet?: string;
}
interface LegacyBook { id: string; url: string; img: string; title: string; categories?: string[] }

// ---------------------------------------------------------------------------
// Seed data that used to live in code
// ---------------------------------------------------------------------------

const CATEGORIES: { legacySlug: string; name: string; description: string }[] = [
  { legacySlug: 'resolución-de-problemas-complejos', name: 'Resolución de problemas complejos', description: 'CPS son las siglas de Complex Problem Solving o Resolución de Problemas Complejos, CPS integra conceptos y valores para desafíos que exigen algo más que la experiencia habitual. No es un método rígido, sino una forma flexible de pensar y actuar.' },
  { legacySlug: 'sistemas-complejos', name: 'Sistemas complejos', description: 'Un sistema complejo es un conjunto de partes interrelacionadas que genera comportamientos inesperados al interactuar. Se adapta y evoluciona con el tiempo, como ecosistemas o redes sociales.' },
  { legacySlug: 'marketing', name: 'Marketing', description: 'El marketing aplicado a problemas complejos analiza diversas variables y propone soluciones con visión amplia. Implica entender el mercado, el entorno y la competencia para adaptarse a los cambios.' },
  { legacySlug: 'estrategia', name: 'Estrategia', description: 'La estrategia, según Richard Rumelt, es elegir prioridades y descartar otras opciones para alcanzar metas claras. Busca ventajas competitivas y alinea recursos donde más conviene.' },
  { legacySlug: 'factor-x', name: 'Factor X', description: 'El Factor X abarca elementos humanos difíciles de detectar que influyen en sistemas y organizaciones. Su singularidad puede ser decisiva en entornos cambiantes.' },
  { legacySlug: 'sociología', name: 'Sociología', description: 'La sociología estudia interacciones y estructuras que conforman la sociedad, abordando problemas sociales complejos y proponiendo mejoras para la convivencia y el bienestar común.' },
  { legacySlug: 'gestión-del-talento', name: 'Gestión del talento', description: 'La gestión del talento identifica, desarrolla y retiene habilidades clave. Alinea el potencial de la gente con los objetivos de la empresa y crea equipos preparados para encarar desafíos.' },
  { legacySlug: 'leyes-y-sesgos', name: 'Leyes y sesgos', description: 'Leyes y sesgos señalan las reglas de los sistemas y los patrones que distorsionan las decisiones. Reconocerlos ayuda a evitar errores y a tomar mejores determinaciones.' },
  { legacySlug: 'trabajo-en-equipo', name: 'Trabajo en equipo', description: 'El trabajo en equipo reúne talentos y perspectivas distintas para encarar retos complejos. Fomenta comunicación, coordinación y creatividad compartida, logrando soluciones que no se conseguirían en solitario.' },
  { legacySlug: 'libros', name: 'Libros', description: 'Turras que incluyen libros relacionados con el ámbito CPS.' },
  { legacySlug: 'futurismo-de-frontera', name: 'Futurismo de frontera', description: 'El futurismo de frontera explora tendencias emergentes y aplica innovaciones que aportan valor a las empresas al enfrentar problemas complejos.' },
  { legacySlug: 'personotecnia', name: 'Personotecnia', description: 'La personotecnia reúne métodos y recursos para crear mensajes muy personalizados. Busca perfilar con más detalle a cada cliente, ofreciendo productos y servicios hechos a su medida.' },
  { legacySlug: 'orquestación-cognitiva', name: 'Orquestación cognitiva', description: 'La orquestación cognitiva es un liderazgo que conecta y coordina a las personas, dentro o fuera de la organización, para enfrentar problemas complejos.' },
  { legacySlug: 'gaming', name: 'Gaming', description: 'El Gaming en el ámbito CPS impulsa creatividad, estrategia y trabajo conjunto.' },
  { legacySlug: 'lectura-de-señales', name: 'Lectura de señales', description: 'La lectura de señales busca captar indicios clave para anticipar tendencias y abordar problemas complejos.' },
  { legacySlug: 'el-contexto-manda', name: 'El contexto manda', description: 'Según Alicia Juarrero, el contexto determina cómo se afrontan los problemas complejos. Entenderlo es clave para tomar decisiones acertadas y adaptarse a los cambios.' },
  { legacySlug: 'desarrollo-de-habilidades', name: 'Desarrollo de habilidades', description: 'El desarrollo de habilidades potencia las capacidades personales y colectivas para afrontar y resolver problemas complejos.' },
  { legacySlug: 'otras-turras-del-querer', name: 'Otras turras del querer', description: 'Otras turras que no encajan en categorías específicas.' },
];

const KNOWN_AUTHOR_NAMES: Record<string, string> = {
  Recuenco: 'Javier G. Recuenco',
  nudpiedo: 'Víctor R. Escobar',
};

const BOOK_CATEGORY_LABELS: Record<string, string> = {
  Nonfiction: 'No ficción',
  Psychology: 'Psicología',
  History: 'Historia',
  Business: 'Negocios y empresa',
  'Self Help': 'Autoayuda',
  'Personal Development': 'Desarrollo personal',
  Technology: 'Tecnología',
  Science: 'Ciencia',
  Biography: 'Biografía',
  Health: 'Salud',
  Economics: 'Economía',
  Education: 'Educación',
  'Artificial Intelligence': 'Inteligencia artificial',
  Games: 'Juegos',
  Fiction: 'Ficción',
};

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface ImportReport {
  counts: Record<string, number>;
  warnings: string[];
  errors: string[];
}

function createReport(): ImportReport {
  return { counts: {}, warnings: [], errors: [] };
}

function count(report: ImportReport, key: string, by = 1): void {
  report.counts[key] = (report.counts[key] ?? 0) + by;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
}

/** Minimal RFC 4180 parser; tolerates spaces before quoted fields. */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let quoted = false;
  let atFieldStart = true;

  while (i < content.length) {
    const char = content[i]!;
    if (quoted) {
      if (char === '"' && content[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (char === '"') { quoted = false; i++; continue; }
      field += char;
      i++;
      continue;
    }
    if (atFieldStart && char === ' ' && /^ *"/.test(content.slice(i))) { i++; continue; }
    if (atFieldStart && char === '"') { quoted = true; atFieldStart = false; i++; continue; }
    if (char === ',') { row.push(field); field = ''; atFieldStart = true; i++; continue; }
    if (char === '\r') { i++; continue; }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      atFieldStart = true;
      i++;
      continue;
    }
    field += char;
    atFieldStart = false;
    i++;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => value.trim() !== ''));
}

function handleFromProfileUrl(url: string): string {
  const handle = url.replace(/\/+$/, '').split('/').pop();
  if (!handle) throw new Error(`Invalid author URL: ${url}`);
  return handle;
}

/** "Name\n@handle" (sometimes with trailing date lines) -> name and handle. */
function splitEmbedAuthor(raw: string): { name: string | null; handle: string | null } {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const handleLine = lines.find((line) => /^@\w{1,15}$/.test(line));
  const handle = handleLine ? handleLine.slice(1) : (/@(\w{1,15})/.exec(raw)?.[1] ?? null);
  const name = lines[0] && lines[0] !== handleLine ? lines[0] : null;
  return { name, handle };
}

/** Media key from a pbs.twimg.com URL, e.g. .../media/DWzPtndWsAAatZU?format=jpg -> DWzPtndWsAAatZU */
function mediaKey(url: string): string | null {
  const match = /pbs\.twimg\.com\/.+\/([^/?.]+)(?:\.[a-z]+)?(?:\?|$)/i.exec(url);
  return match ? match[1]! : null;
}

/** Key of a local file name: "DWzPtndWsAAatZU_2.jpeg" -> "DWzPtndWsAAatZU" */
function localFileKey(file: string): string {
  return file.replace(/\.[a-z]+$/i, '').replace(/_2$/, '');
}

function videoKind(videoUrl: string): 'gif' | 'video' {
  return videoUrl.includes('/tweet_video/') ? 'gif' : 'video';
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportPaths {
  dataDir: string;    // legacy infrastructure/db
  publicDir: string;  // public/ (metadata images, podcast mp3s)
}

export function importLegacy(db: Db, paths: ImportPaths): ImportReport {
  const report = createReport();
  const warn = (message: string): void => { report.warnings.push(message); };
  const fail = (message: string): void => { report.errors.push(message); };

  const legacyThreads = readJson<LegacyTweet[][]>(paths.dataDir, 'tweets.json');
  const enriched = readJson<LegacyEnriched[]>(paths.dataDir, 'tweets_enriched.json');
  const categoryMap = readJson<{ id: string; categories: string }[]>(paths.dataDir, 'tweets_map.json');
  const summaries = readJson<{ id: string; summary: string }[]>(paths.dataDir, 'tweets_summary.json');
  const exams = readJson<{ id: string; questions: { question: string; options: string[]; answer: number }[] }[]>(paths.dataDir, 'tweets_exam.json');
  const podcasts = readJson<{ id: string }[]>(paths.dataDir, 'tweets_podcast.json');
  const books = readJson<LegacyBook[]>(paths.dataDir, 'books.json');
  const glossaryRows = parseCsv(readFileSync(join(paths.dataDir, 'glosario.csv'), 'utf8'));

  // Local media files indexed by X media key
  const metadataDir = join(paths.publicDir, 'metadata');
  const localFiles = existsSync(metadataDir) ? readdirSync(metadataDir).sort() : [];
  const localFileSet = new Set(localFiles);
  const localByKey = new Map<string, string[]>();
  for (const file of localFiles) {
    const key = localFileKey(file);
    localByKey.set(key, [...(localByKey.get(key) ?? []), file]);
  }
  const referencedFiles = new Set<string>();

  /** Resolves a legacy image reference to a servable URL (local /metadata/... or remote). */
  function resolveImage(localPath: string | undefined, remoteUrl: string | undefined): string | null {
    if (localPath?.startsWith('./metadata/')) {
      const file = localPath.slice('./metadata/'.length);
      if (localFileSet.has(file)) {
        referencedFiles.add(file);
        return `/metadata/${file}`;
      }
    }
    const key = remoteUrl ? mediaKey(remoteUrl) : null;
    const candidates = key ? localByKey.get(key) : undefined;
    if (candidates?.length) {
      const file = candidates.find((f) => /_2\./.test(f)) ?? candidates[0]!;
      referencedFiles.add(file);
      return `/metadata/${file}`;
    }
    if (remoteUrl?.startsWith('http')) return remoteUrl;
    if (localPath?.startsWith('http')) return localPath;
    return null;
  }

  const enrichedByTweet = new Map<string, LegacyEnriched[]>();
  for (const record of enriched) {
    enrichedByTweet.set(record.id, [...(enrichedByTweet.get(record.id) ?? []), record]);
  }

  // --- 1. Categories -------------------------------------------------------
  const categorySlugByLegacy = new Map<string, string>();
  CATEGORIES.forEach((category, position) => {
    const slug = slugify(category.legacySlug);
    categorySlugByLegacy.set(category.legacySlug, slug);
    db.prepare('INSERT INTO categories (slug, name, description, position) VALUES (?, ?, ?, ?)').run(
      slug, category.name, category.description, position,
    );
    count(report, 'categories');
  });

  // --- 2. Drop threads fully contained in another thread ------------------
  const threadTweetIds = legacyThreads.map((thread) => new Set(thread.map((t) => t.id)));
  const droppedThreadIds = new Set<string>();
  legacyThreads.forEach((thread, i) => {
    const ids = threadTweetIds[i]!;
    const container = legacyThreads.findIndex((other, j) =>
      j !== i && other.length > thread.length && [...ids].every((id) => threadTweetIds[j]!.has(id)),
    );
    if (container !== -1) {
      droppedThreadIds.add(thread[0]!.id);
      warn(`Dropped thread ${thread[0]!.id}: all ${thread.length} tweets are part of thread ${legacyThreads[container]![0]!.id}`);
      count(report, 'duplicateThreadsRemoved');
      count(report, 'duplicateTweetsRemoved', thread.length);
    }
  });
  const threads = legacyThreads
    .filter((thread) => !droppedThreadIds.has(thread[0]!.id))
    .sort((a, b) => (BigInt(a[0]!.id) < BigInt(b[0]!.id) ? -1 : 1));

  const seenTweetIds = new Map<string, string>();
  for (const thread of threads) {
    for (const tweet of thread) {
      const owner = seenTweetIds.get(tweet.id);
      if (owner) fail(`Tweet ${tweet.id} appears in threads ${owner} and ${thread[0]!.id}`);
      seenTweetIds.set(tweet.id, thread[0]!.id);
    }
  }

  // --- 3..8. Authors, threads, tweets, enrichment ---------------------------
  const summaryById = new Map<string, string>();
  for (const { id, summary } of summaries) {
    if (summaryById.has(id)) warn(`Thread ${id} has several summaries; keeping the last one: "${summary}"`);
    summaryById.set(id, summary.trim());
  }
  const categoriesById = new Map(categoryMap.map(({ id, categories }) => [id, categories.split(',').map((c) => c.trim())]));
  const examById = new Map(exams.map((exam) => [exam.id, exam.questions]));
  const podcastIds = new Set(podcasts.map(({ id }) => id));
  const authorNames = new Map<string, string>();

  for (const thread of threads) {
    const root = thread[0]!;
    const handles = new Set(thread.map((t) => handleFromProfileUrl(t.author)));
    if (handles.size !== 1) fail(`Thread ${root.id} has several authors: ${[...handles].join(', ')}`);
    const handle = handleFromProfileUrl(root.author);
    if (root.authorName) authorNames.set(handle, root.authorName);

    for (let i = 1; i < thread.length; i++) {
      if (BigInt(thread[i]!.id) <= BigInt(thread[i - 1]!.id)) fail(`Thread ${root.id}: tweet ids are not increasing at position ${i}`);
    }

    const title = summaryById.get(root.id);
    if (!title) fail(`Thread ${root.id} has no summary`);

    const slugs = (categoriesById.get(root.id) ?? []).map((legacy) => {
      const slug = categorySlugByLegacy.get(legacy);
      if (!slug) fail(`Thread ${root.id} has unknown category "${legacy}"`);
      return slug ?? '';
    });
    if (slugs.length === 0) fail(`Thread ${root.id} has no categories`);

    const legacyExam = examById.get(root.id);
    let exam: ExamQuestion[] | null = null;
    if (!legacyExam || legacyExam.length === 0) {
      warn(`Thread ${root.id} has no exam`);
    } else {
      exam = legacyExam.map((q) => {
        if (q.options.length !== 3 || q.answer < 1 || q.answer > q.options.length) {
          fail(`Thread ${root.id}: invalid exam question "${q.question}"`);
        }
        return { question: q.question, options: q.options, answer: q.answer - 1 };
      });
      count(report, 'exams');
    }

    let podcastUrl: string | null = null;
    const hasMp3 = existsSync(join(paths.publicDir, 'podcast', `${root.id}.mp3`));
    if (podcastIds.has(root.id)) {
      if (hasMp3) {
        podcastUrl = `/podcast/${root.id}.mp3`;
        count(report, 'podcasts');
      } else {
        fail(`Thread ${root.id} is listed as podcast but public/podcast/${root.id}.mp3 is missing`);
      }
    } else if (hasMp3) {
      warn(`public/podcast/${root.id}.mp3 exists but the thread is not listed as podcast`);
    }

    const tweets = thread.map((legacy) => convertTweet(legacy));
    const publishedAt = tweets[0]!.createdAt;

    upsertAuthor(db, { handle, name: KNOWN_AUTHOR_NAMES[handle] ?? handle, xUserId: null, avatarUrl: null });
    insertThread(db, { id: root.id, authorHandle: handle, title: title ?? '', publishedAt, exam, podcastUrl, syncedAt: null });
    replaceTweets(db, root.id, tweets);
    setThreadCategories(db, root.id, slugs.filter(Boolean));
    count(report, 'threads');
    count(report, 'tweets', tweets.length);
  }

  // Author display names: legacy authorName wins, then the known list, else the handle
  for (const { handle } of db.prepare('SELECT handle FROM authors ORDER BY handle').all() as { handle: string }[]) {
    const name = authorNames.get(handle) ?? KNOWN_AUTHOR_NAMES[handle];
    if (!name) warn(`Author @${handle} has no display name; using the handle`);
    db.prepare('UPDATE authors SET name = ? WHERE handle = ?').run(name ?? handle, handle);
    count(report, 'authors');
  }

  function convertTweet(legacy: LegacyTweet): Tweet {
    const createdAt = snowflakeTime(legacy.id);
    if (Math.abs(Date.parse(createdAt) - Date.parse(legacy.time)) > 24 * 3600 * 1000) count(report, 'datesFixed');
    if (legacy.tweet.trim() === '') warn(`Tweet ${legacy.id} has empty text`);

    const records = enrichedByTweet.get(legacy.id) ?? [];
    return {
      id: legacy.id,
      text: legacy.tweet,
      createdAt,
      stats: convertStats(legacy),
      media: convertMedia(legacy, records),
      links: convertLinks(legacy, records),
      quote: convertQuote(legacy, records),
    };
  }

  function convertStats(legacy: LegacyTweet): TweetStats {
    const read = (...keys: string[]): number => {
      const key = keys.find((k) => legacy.stats[k] !== undefined);
      const value = parseCount(key ? legacy.stats[key] : undefined);
      if (value === null) {
        warn(`Tweet ${legacy.id}: unparsable ${key} "${key ? legacy.stats[key] : ''}"`);
        return 0;
      }
      return value;
    };
    return {
      likes: read('likes'),
      retweets: read('retweets'),
      replies: read('replies'),
      quotes: read('quotetweets', 'quotetweet', 'quotes', 'quote'),
      bookmarks: read('bookmarks'),
      views: read('views'),
    };
  }

  function isYoutubeRecord(record: LegacyEnriched): boolean {
    return record.media === 'youtube' || record.domain === 'youtube.com';
  }

  function convertMedia(legacy: LegacyTweet, records: LegacyEnriched[]): Media[] {
    const mediaRecords = records.filter((r) => (r.type === 'media' || r.type === 'image') && !isYoutubeRecord(r));
    const legacyImgs = legacy.metadata?.type === 'media' ? legacy.metadata.imgs ?? [] : [];

    // Enriched records (local file + video) keyed by media key, to complete tweets.json images
    const recordByKey = new Map<string, LegacyEnriched>();
    for (const record of mediaRecords) {
      const file = record.img?.startsWith('./metadata/') ? record.img.slice('./metadata/'.length) : record.img;
      const key = file ? (file.startsWith('http') ? mediaKey(file) : localFileKey(file)) : null;
      if (key) recordByKey.set(key, record);
    }

    const sources: { img: string | undefined; local: string | undefined; video: string | undefined }[] =
      legacyImgs.length > 0
        ? legacyImgs.map((img) => {
            const key = mediaKey(img.img);
            const record = key ? recordByKey.get(key) : undefined;
            return { img: img.img, local: record?.img, video: img.video ?? record?.video };
          })
        : mediaRecords.map((record) => ({ img: undefined, local: record.img, video: record.video }));

    const media: Media[] = [];
    for (const source of sources) {
      const image = resolveImage(source.local, source.img);
      let video = source.video;
      const thumbKey = source.img && /tweet_video_thumb/.test(source.img) ? mediaKey(source.img) : null;
      if (!video && thumbKey) video = `https://video.twimg.com/tweet_video/${thumbKey}.mp4`;

      if (video) {
        media.push({ kind: videoKind(video), url: video, posterUrl: image, alt: null });
        count(report, 'mediaVideos');
      } else if (image) {
        media.push({ kind: 'photo', url: image, posterUrl: null, alt: null });
        count(report, image.startsWith('/metadata/') ? 'mediaLocal' : 'mediaRemote');
      } else {
        warn(`Tweet ${legacy.id}: dropped image with no usable file or URL (${source.local ?? source.img ?? '?'})`);
        count(report, 'mediaDropped');
      }
    }
    return media;
  }

  function convertLinks(legacy: LegacyTweet, records: LegacyEnriched[]): Link[] {
    const cards = records.filter((r) => r.type === 'card' || ((r.type === 'image' || r.type === 'media') && isYoutubeRecord(r)));
    const links: Link[] = [];

    for (const card of cards) {
      const title = card.title?.trim() || card.caption?.trim() || null;
      let url = card.url?.trim() ?? '';
      if (!url && isYoutubeRecord(card) && title) {
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;
      }
      if (!url) {
        warn(`Tweet ${legacy.id}: dropped card without URL`);
        count(report, 'linksDropped');
        continue;
      }
      links.push({
        url,
        domain: card.domain?.trim() || domainOf(url),
        title,
        description: card.description?.trim() || null,
        imageUrl: resolveImage(card.img, undefined),
      });
      count(report, 'links');
    }

    // Tweets whose enrichment failed still have the raw card from the scraper
    const raw = legacy.metadata;
    if (cards.length === 0 && raw?.type === 'card' && raw.url) {
      links.push({
        url: raw.url,
        domain: raw.domain || domainOf(raw.url),
        title: raw.title?.trim() || null,
        description: null,
        imageUrl: resolveImage(undefined, raw.img),
      });
      count(report, 'links');
      warn(`Tweet ${legacy.id}: card imported from raw scraper metadata (not enriched)`);
    }
    return links;
  }

  function convertQuote(legacy: LegacyTweet, records: LegacyEnriched[]): Quote | null {
    const embedRecord = records.find((r) => r.type === 'embed');
    const raw = legacy.metadata?.embed;
    if (!embedRecord && !raw) return null;

    const author = splitEmbedAuthor(embedRecord?.author ?? raw?.author ?? '');
    const quotedId = [embedRecord?.embeddedTweetId, raw?.id].find((id) => id && /^\d+$/.test(id)) ?? null;
    if (!quotedId) warn(`Tweet ${legacy.id}: quoted tweet id is unknown`);

    const img = embedRecord?.img ?? raw?.img;
    const video = embedRecord?.video ?? raw?.video;
    const image = img ? resolveImage(img, img) : null;
    const media: Media[] = video
      ? [{ kind: videoKind(video), url: video, posterUrl: image, alt: null }]
      : image ? [{ kind: 'photo', url: image, posterUrl: null, alt: null }] : [];

    count(report, 'quotes');
    return {
      quotedId,
      authorHandle: author.handle,
      authorName: author.name,
      text: embedRecord?.tweet ?? raw?.tweet ?? '',
      media,
    };
  }

  // --- 9. Books ---------------------------------------------------------------
  const linkUrls = new Set((db.prepare('SELECT DISTINCT url FROM links').all() as { url: string }[]).map((r) => r.url));
  const booksByUrl = new Map<string, { title: string; imageUrl: string | null; categories: Set<string> }>();
  for (const book of books) {
    const entry = booksByUrl.get(book.url) ?? { title: book.title, imageUrl: resolveImage(book.img, undefined), categories: new Set<string>() };
    for (const category of book.categories ?? []) {
      const label = BOOK_CATEGORY_LABELS[category];
      if (label) entry.categories.add(label);
      else warn(`Book ${book.url}: unknown category "${category}"`);
    }
    booksByUrl.set(book.url, entry);
  }
  for (const [url, book] of [...booksByUrl].sort(([a], [b]) => a.localeCompare(b))) {
    if (!linkUrls.has(url)) warn(`Book ${url} is not linked from any tweet`);
    const labels = Object.values(BOOK_CATEGORY_LABELS).filter((label) => book.categories.has(label));
    upsertBook(db, { url, title: book.title, imageUrl: book.imageUrl, categories: labels });
    count(report, 'books');
  }
  count(report, 'bookDuplicatesMerged', books.length - booksByUrl.size);

  // --- 10. Glossary -----------------------------------------------------------
  const insertTerm = db.prepare('INSERT INTO glossary (term, definition, reference) VALUES (?, ?, ?)');
  const seenTerms = new Set<string>();
  for (const [term = '', definition = '', reference = ''] of glossaryRows) {
    const cleanTerm = term.trim();
    if (!cleanTerm || !definition.trim()) { fail(`Invalid glossary row: ${term}`); continue; }
    if (seenTerms.has(cleanTerm)) { fail(`Duplicate glossary term: ${cleanTerm}`); continue; }
    seenTerms.add(cleanTerm);
    insertTerm.run(cleanTerm, definition.trim(), reference.trim() || null);
    count(report, 'glossaryTerms');
  }

  // --- 11. Derived index and integrity ------------------------------------------
  rebuildSearch(db);
  const fkProblems = db.prepare('PRAGMA foreign_key_check').all();
  if (fkProblems.length > 0) fail(`Foreign key violations: ${JSON.stringify(fkProblems.slice(0, 5))}`);

  // --- 12. Every visible legacy thread is still available ------------------------
  const countTweets = db.prepare('SELECT count(*) AS n FROM tweets WHERE thread_id = ?');
  const countCategories = db.prepare('SELECT count(*) AS n FROM thread_categories WHERE thread_id = ?');
  for (const thread of legacyThreads) {
    const id = thread[0]!.id;
    if (droppedThreadIds.has(id)) continue;
    const { n } = countTweets.get(id) as { n: number };
    if (n !== thread.length) fail(`Thread ${id}: ${n} tweets in the database, ${thread.length} in legacy data`);
    if ((countCategories.get(id) as { n: number }).n === 0) fail(`Thread ${id} has no categories`);
  }

  const orphanFiles = localFiles.filter((file) => !referencedFiles.has(file));
  count(report, 'orphanMediaFiles', orphanFiles.length);
  for (const file of orphanFiles) warn(`Unreferenced file public/metadata/${file}`);

  return report;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  const root = process.cwd();
  const target = join(root, 'data', 'turrero.db');
  const temp = join(root, 'data', 'turrero.import.db');
  rmSync(temp, { force: true });

  const db = openDb(temp);
  migrate(db);
  const report = transaction(db, () =>
    importLegacy(db, { dataDir: join(root, 'infrastructure', 'db'), publicDir: join(root, 'public') }),
  );
  const integrity = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
  if (integrity.integrity_check !== 'ok') report.errors.push(`integrity_check: ${integrity.integrity_check}`);
  db.exec('VACUUM');
  db.close();

  console.log('Legacy import report');
  console.log('====================');
  for (const [key, value] of Object.entries(report.counts).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${key.padEnd(26)} ${value}`);
  }
  console.log(`${'warnings'.padEnd(26)} ${report.warnings.length}`);
  console.log(`${'errors'.padEnd(26)} ${report.errors.length}`);
  if (process.argv.includes('--verbose')) report.warnings.forEach((w) => console.log(`WARN  ${w}`));
  report.errors.forEach((e) => console.log(`ERROR ${e}`));

  if (report.errors.length > 0) {
    rmSync(temp, { force: true });
    console.log(`\nImport failed; ${basename(target)} was not modified.`);
    process.exit(1);
  }
  renameSync(temp, target);
  console.log(`\nWrote ${target}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
