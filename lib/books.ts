// Author and cover of the books linked in the turras, from public catalogues (no API keys):
// the book's own Goodreads page (exact), Open Library by Goodreads id (exact), then Open Library and
// Google Books by title (fuzzy, checked against the subtitle).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ResponseCache } from './cache';

export interface BookMetadata {
  author: string | null;
  coverUrl: string | null;
  source: 'goodreads' | 'openlibrary-goodreads' | 'openlibrary-title' | 'googlebooks' | null;
  matchedTitle: string | null;
  /** Title similarity of the match (1 for an exact Goodreads id match). */
  score: number;
}

export interface CatalogClient {
  lookup(book: { url: string; title: string }): Promise<BookMetadata>;
}

/** Minimum title similarity to accept a title search result. */
export const MIN_TITLE_SCORE = 0.6;

const NONE: BookMetadata = { author: null, coverUrl: null, source: null, matchedTitle: null, score: 0 };

export function goodreadsId(url: string): string | null {
  return /goodreads\.com\/(?:[a-z]{2}\/)?book\/show\/(\d+)/.exec(url)?.[1] ?? null;
}

/** Main title without subtitle, series or edition notes: "Good Strategy Bad Strategy: The…" → "Good Strategy Bad Strategy". */
export function mainTitle(title: string): string {
  return title.split(/[:(]/)[0]!.trim();
}

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1);
}

/** Consecutive word pairs, so word order matters ("The War of Art" is not "The Art of War"). */
function pairs(text: string): string[] {
  const list = ['^', ...words(mainTitle(text))];
  return list.slice(1).map((word, i) => `${list[i]} ${word}`);
}

/** Dice similarity of the main titles' word pairs, from 0 to 1. */
export function titleScore(wanted: string, candidate: string): number {
  const a = pairs(wanted);
  const b = pairs(candidate);
  if (a.length === 0 || b.length === 0) return 0;
  const pool = [...b];
  let common = 0;
  for (const pair of a) {
    const index = pool.indexOf(pair);
    if (index >= 0) {
      common++;
      pool.splice(index, 1);
    }
  }
  return (2 * common) / (a.length + b.length);
}

/** Subtitle: what follows the first ':' (no edition notes; a truncated last word is dropped). */
export function subtitleOf(title: string): string {
  const index = title.indexOf(':');
  if (index < 0) return '';
  const rest = title.slice(index + 1).replace(/\(.*?\)/g, ' ');
  return (rest.includes('…') ? rest.slice(0, rest.indexOf('…')).replace(/\S*$/, '') : rest).trim();
}

/**
 * How sure a title search result is the same book (0 to 1). The main titles must match; when the
 * book has a subtitle, the candidate's subtitle must share most of its words too ("Proof: The Science
 * of Booze" is not the novel "Proof"). A title without subtitle needs at least three words to be trusted.
 */
export function matchScore(wanted: string, candidateTitle: string, candidateSubtitle = subtitleOf(candidateTitle)): number {
  const main = titleScore(wanted, candidateTitle);
  const wantedSubtitle = subtitleOf(wanted);
  if (!wantedSubtitle) return words(mainTitle(wanted)).length >= 3 ? main : 0;
  const a = new Set(words(wantedSubtitle));
  const b = new Set(words(candidateSubtitle));
  if (a.size === 0 || b.size === 0) return 0;
  const shared = [...a].filter((word) => b.has(word)).length / Math.min(a.size, b.size);
  return shared >= 0.5 ? main : 0;
}

interface OpenLibraryDoc {
  title?: string;
  subtitle?: string;
  author_name?: string[];
  cover_i?: number;
}
interface GoogleVolume {
  volumeInfo?: { title?: string; subtitle?: string; authors?: string[]; imageLinks?: { thumbnail?: string } };
}

interface JsonLdBook {
  name?: string;
  image?: string;
  author?: { name?: string }[];
}

function parseJsonLd(html: string): JsonLdBook | null {
  try {
    return JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1] ?? 'null') as JsonLdBook | null;
  } catch {
    return null;
  }
}

const openLibraryCover =(id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;

export function createCatalogClient({
  fetch: fetchFn = fetch,
  cache,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  minIntervalMs = 1000,
}: {
  fetch?: typeof fetch;
  cache?: ResponseCache;
  sleep?: (ms: number) => Promise<void>;
  minIntervalMs?: number;
}): CatalogClient {
  let last = 0;

  async function getJson<T>(url: string): Promise<T | null> {
    const cached = cache?.read(url);
    if (cached !== undefined) return cached as T;
    const wait = last + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const response = await fetchFn(url, { headers: { 'User-Agent': 'ElTurreroPost/1.0 (+https://turrero.vercel.app)' } });
    if (!response.ok) return null;
    const json = (await response.json()) as T;
    cache?.write(url, json);
    return json;
  }

  /** Structured data (JSON-LD) of a Goodreads book page; only these fields are cached, not the page. */
  async function goodreads(url: string): Promise<{ name: string | null; author: string | null; image: string | null } | null> {
    const key = `goodreads:${url}`;
    // A page served without data (Goodreads sometimes does) is not cached, so it is retried next run
    const cached = cache?.read(key);
    if (cached) return cached as { name: string | null; author: string | null; image: string | null };
    const wait = last + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const response = await fetchFn(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ElTurreroPost/1.0; +https://turrero.vercel.app)' } });
    if (!response.ok) return null;
    const html = await response.text();
    const book = parseJsonLd(html);
    // Fallbacks for the page variant without JSON-LD
    const meta = (property: string) => new RegExp(`<meta property="${property}" content="([^"]*)"`).exec(html)?.[1];
    const image = book?.image ?? meta('og:image') ?? null;
    const data = {
      name: book?.name ?? meta('og:title') ?? null,
      // Goodreads pads some names with runs of spaces ("Adam   Rogers")
      author:
        (book?.author?.[0]?.name ?? /class="authorName"[^>]*>\s*<span itemprop="name">([^<]+)/.exec(html)?.[1])
          ?.replace(/\s+/g, ' ')
          .trim() ?? null,
      // Goodreads' own "no photo" image is not a cover
      image: image && !/nophoto/i.test(image) ? image : null,
    };
    if (!data.author && !data.image) return null;
    cache?.write(key, data);
    return data;
  }

  async function openLibrary(query: string): Promise<OpenLibraryDoc[]> {
    const url = `https://openlibrary.org/search.json?${query}&fields=title,subtitle,author_name,cover_i&limit=5`;
    return (await getJson<{ docs?: OpenLibraryDoc[] }>(url))?.docs ?? [];
  }

  function best<T>(candidates: T[], titleOf: (c: T) => [string, string | undefined], title: string): { candidate: T; score: number } | null {
    const scored = candidates.map((candidate) => ({ candidate, score: matchScore(title, ...titleOf(candidate)) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0] && scored[0].score >= MIN_TITLE_SCORE ? scored[0] : null;
  }

  return {
    async lookup({ url, title }) {
      let result: BookMetadata = NONE;

      const id = goodreadsId(url);
      if (id) {
        const page = await goodreads(url);
        if (page && (page.author || page.image)) {
          result = { author: page.author, coverUrl: page.image, source: 'goodreads', matchedTitle: page.name, score: 1 };
        }
      }
      if (result.author && result.coverUrl) return result;

      if (id) {
        const [doc] = await openLibrary(`q=id_goodreads:${id}`);
        if (doc) {
          result = {
            author: result.author ?? doc.author_name?.[0] ?? null,
            coverUrl: result.coverUrl ?? (doc.cover_i ? openLibraryCover(doc.cover_i) : null),
            source: result.source ?? 'openlibrary-goodreads',
            matchedTitle: result.matchedTitle ?? doc.title ?? null,
            score: 1,
          };
        }
      }
      if (result.author && result.coverUrl) return result;

      const byTitle = best(await openLibrary(`title=${encodeURIComponent(mainTitle(title))}`), (d) => [d.title ?? '', d.subtitle], title);
      if (byTitle) {
        const doc = byTitle.candidate;
        result = {
          author: result.author ?? doc.author_name?.[0] ?? null,
          coverUrl: result.coverUrl ?? (doc.cover_i ? openLibraryCover(doc.cover_i) : null),
          source: result.source ?? 'openlibrary-title',
          matchedTitle: result.matchedTitle ?? doc.title ?? null,
          score: result.source ? result.score : byTitle.score,
        };
      }
      if (result.author && result.coverUrl) return result;

      const google = await getJson<{ items?: GoogleVolume[] }>(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(mainTitle(title))}&maxResults=5&printType=books`,
      );
      const volume = best(google?.items ?? [], (v) => [v.volumeInfo?.title ?? '', v.volumeInfo?.subtitle], title);
      if (volume) {
        const info = volume.candidate.volumeInfo!;
        const thumbnail = info.imageLinks?.thumbnail?.replace(/^http:/, 'https:').replace('&edge=curl', '') ?? null;
        result = {
          author: result.author ?? info.authors?.[0] ?? null,
          coverUrl: result.coverUrl ?? thumbnail,
          source: result.source ?? 'googlebooks',
          matchedTitle: result.matchedTitle ?? info.title ?? null,
          score: result.source ? result.score : volume.score,
        };
      }
      return result;
    },
  };
}

// Goodreads "no cover" logo, downloaded under several names by the old scraper
const PLACEHOLDER_COVER = /\/SJJzT3AT(_\d+)?\.jpeg$/;

/**
 * Local cover that really exists (not the Goodreads placeholder), or null. Remote images are X link
 * previews (pbs.twimg.com/news_img), which expire, so they do not count as covers.
 */
export function realCover(imageUrl: string | null, publicDir = join(process.cwd(), 'public')): string | null {
  if (!imageUrl || !imageUrl.startsWith('/') || PLACEHOLDER_COVER.test(imageUrl)) return null;
  return existsSync(join(publicDir, imageUrl)) ? imageUrl : null;
}
