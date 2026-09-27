// Read queries used by the site. Every function takes the database last so tests can pass their own.
import { getDb, type Db } from './db';
import { SEARCH_MARK_END, SEARCH_MARK_START } from './types';
import type {
  Author,
  Book,
  Category,
  ExamQuestion,
  GlossaryTerm,
  Link,
  Media,
  Quote,
  SearchResult,
  Thread,
  ThreadSummary,
  Tweet,
  TweetStats,
} from './types';

type Row = Record<string, string | number | null>;

const str = (value: string | number | null | undefined): string => String(value ?? '');
const optStr = (value: string | number | null | undefined): string | null => (value == null ? null : String(value));

function toStats(row: Row): TweetStats {
  return {
    likes: Number(row.likes),
    retweets: Number(row.retweets),
    replies: Number(row.replies),
    quotes: Number(row.quotes),
    bookmarks: Number(row.bookmarks),
    views: Number(row.views),
  };
}

function toAuthor(row: Row): Author {
  return { handle: str(row.handle), name: str(row.name), xUserId: optStr(row.x_user_id), avatarUrl: optStr(row.avatar_url) };
}

// ---------------------------------------------------------------------------
// Thread lists
// ---------------------------------------------------------------------------

const SUMMARY_SELECT = `
  SELECT t.id, t.title, t.published_at, a.handle, a.name,
         w.likes, w.retweets, w.replies, w.quotes, w.bookmarks, w.views
  FROM threads t
  JOIN authors a ON a.handle = t.author_handle
  JOIN tweets w ON w.id = t.id`;

function toSummary(row: Row): ThreadSummary {
  return {
    id: str(row.id),
    title: str(row.title),
    publishedAt: str(row.published_at),
    authorHandle: str(row.handle),
    authorName: str(row.name),
    stats: toStats(row),
  };
}

function listSummaries(where: string, params: (string | number)[], db: Db): ThreadSummary[] {
  return (db.prepare(`${SUMMARY_SELECT} ${where}`).all(...params) as Row[]).map(toSummary);
}

export function listNewest(limit: number, db: Db = getDb()): ThreadSummary[] {
  return listSummaries('ORDER BY t.published_at DESC LIMIT ?', [limit], db);
}

/** Engagement of the root tweet: retweets + quotes + likes. */
export function listTopByEngagement(limit: number, db: Db = getDb()): ThreadSummary[] {
  return listSummaries('ORDER BY w.retweets + w.quotes + w.likes DESC, t.published_at DESC LIMIT ?', [limit], db);
}

export function listThreadsByCategory(slug: string, db: Db = getDb()): ThreadSummary[] {
  return listSummaries(
    'JOIN thread_categories c ON c.thread_id = t.id WHERE c.category_slug = ? ORDER BY t.published_at DESC',
    [slug],
    db,
  );
}

export function listThreadsByAuthor(handle: string, db: Db = getDb()): ThreadSummary[] {
  return listSummaries('WHERE t.author_handle = ? ORDER BY t.published_at DESC', [handle], db);
}

export function listThreadsNotByAuthor(handle: string, db: Db = getDb()): ThreadSummary[] {
  return listSummaries('WHERE t.author_handle <> ? ORDER BY t.published_at DESC', [handle], db);
}

export function listThreadIds(db: Db = getDb()): string[] {
  return (db.prepare('SELECT id FROM threads ORDER BY published_at DESC').all() as Row[]).map((row) => str(row.id));
}

/** Thread that contains a tweet (old URLs pointed to any tweet of a thread). */
export function getThreadIdOfTweet(tweetId: string, db: Db = getDb()): string | null {
  const row = db.prepare('SELECT thread_id FROM tweets WHERE id = ?').get(tweetId) as Row | undefined;
  return row ? str(row.thread_id) : null;
}

export function getSiteStats(db: Db = getDb()): { threads: number; lastPublishedAt: string | null } {
  const row = db.prepare('SELECT count(*) AS n, max(published_at) AS last FROM threads').get() as Row;
  return { threads: Number(row.n), lastPublishedAt: optStr(row.last) };
}

// ---------------------------------------------------------------------------
// Categories and authors
// ---------------------------------------------------------------------------

export function listCategories(db: Db = getDb()): Category[] {
  return (db.prepare('SELECT slug, name, description FROM categories ORDER BY position').all() as Row[]).map((row) => ({
    slug: str(row.slug),
    name: str(row.name),
    description: str(row.description),
  }));
}

export function getCategory(slug: string, db: Db = getDb()): Category | null {
  return listCategories(db).find((category) => category.slug === slug) ?? null;
}

export function listAuthors(db: Db = getDb()): (Author & { threads: number })[] {
  return (
    db
      .prepare(
        `SELECT a.*, count(t.id) AS threads FROM authors a JOIN threads t ON t.author_handle = a.handle
         GROUP BY a.handle ORDER BY threads DESC, a.handle`,
      )
      .all() as Row[]
  ).map((row) => ({ ...toAuthor(row), threads: Number(row.threads) }));
}

export function getAuthor(handle: string, db: Db = getDb()): Author | null {
  const row = db.prepare('SELECT * FROM authors WHERE handle = ?').get(handle) as Row | undefined;
  return row ? toAuthor(row) : null;
}

// ---------------------------------------------------------------------------
// Single thread
// ---------------------------------------------------------------------------

function toMedia(row: Row): Media {
  return { kind: str(row.kind) as Media['kind'], url: str(row.url), posterUrl: optStr(row.poster_url), alt: optStr(row.alt) };
}

export function getThread(id: string, db: Db = getDb()): Thread | null {
  const row = db
    .prepare('SELECT t.*, a.handle, a.name, a.x_user_id, a.avatar_url FROM threads t JOIN authors a ON a.handle = t.author_handle WHERE t.id = ?')
    .get(id) as Row | undefined;
  if (!row) return null;

  const categories = (
    db
      .prepare(
        `SELECT c.slug, c.name, c.description FROM thread_categories tc JOIN categories c ON c.slug = tc.category_slug
         WHERE tc.thread_id = ? ORDER BY tc.position`,
      )
      .all(id) as Row[]
  ).map((c) => ({ slug: str(c.slug), name: str(c.name), description: str(c.description) }));

  const mediaByTweet = groupBy(
    db.prepare('SELECT m.* FROM media m JOIN tweets w ON w.id = m.tweet_id WHERE w.thread_id = ? ORDER BY m.position').all(id) as Row[],
  );
  const linksByTweet = groupBy(
    db.prepare('SELECT l.* FROM links l JOIN tweets w ON w.id = l.tweet_id WHERE w.thread_id = ? ORDER BY l.rowid').all(id) as Row[],
  );
  const quoteByTweet = new Map(
    (db.prepare('SELECT q.* FROM quotes q JOIN tweets w ON w.id = q.tweet_id WHERE w.thread_id = ?').all(id) as Row[]).map(
      (q) => [str(q.tweet_id), q],
    ),
  );

  const tweets = (db.prepare('SELECT * FROM tweets WHERE thread_id = ? ORDER BY position').all(id) as Row[]).map(
    (tweet): Tweet => {
      const tweetId = str(tweet.id);
      const quote = quoteByTweet.get(tweetId);
      return {
        id: tweetId,
        text: str(tweet.text),
        createdAt: str(tweet.created_at),
        stats: toStats(tweet),
        media: (mediaByTweet.get(tweetId) ?? []).map(toMedia),
        links: (linksByTweet.get(tweetId) ?? []).map(
          (link): Link => ({
            url: str(link.url),
            domain: str(link.domain),
            title: optStr(link.title),
            description: optStr(link.description),
            imageUrl: optStr(link.image_url),
          }),
        ),
        quote: quote ? toQuote(quote) : null,
      };
    },
  );

  return {
    id,
    title: str(row.title),
    publishedAt: str(row.published_at),
    author: toAuthor(row),
    categories,
    tweets,
    exam: row.exam_json ? (JSON.parse(str(row.exam_json)) as ExamQuestion[]) : null,
    podcastUrl: optStr(row.podcast_url),
  };
}

function toQuote(row: Row): Quote {
  return {
    quotedId: optStr(row.quoted_id),
    authorHandle: optStr(row.author_handle),
    authorName: optStr(row.author_name),
    text: str(row.text),
    media: row.media_json ? (JSON.parse(str(row.media_json)) as Media[]) : [],
  };
}

function groupBy(rows: Row[]): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = str(row.tweet_id);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Full-text search over tweet texts (accent-insensitive, prefix matching), best match per thread. */
export function search(query: string, limit = 20, db: Db = getDb()): SearchResult[] {
  const terms = query.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (terms.length === 0) return [];
  const match = terms.map((term) => `"${term}"*`).join(' ');

  const rows = db
    .prepare(
      `SELECT s.thread_id, s.tweet_id, t.title, t.published_at,
              snippet(search, 2, '${SEARCH_MARK_START}', '${SEARCH_MARK_END}', '…', 16) AS snippet
       FROM search s JOIN threads t ON t.id = s.thread_id
       WHERE search MATCH ? ORDER BY rank LIMIT 200`,
    )
    .all(match) as Row[];

  const results = new Map<string, SearchResult>();
  for (const row of rows) {
    const threadId = str(row.thread_id);
    if (results.has(threadId)) continue;
    results.set(threadId, {
      threadId,
      tweetId: str(row.tweet_id),
      title: str(row.title),
      publishedAt: str(row.published_at),
      snippet: str(row.snippet),
    });
    if (results.size === limit) break;
  }
  return [...results.values()];
}

// ---------------------------------------------------------------------------
// Books, glossary, graph
// ---------------------------------------------------------------------------

export function listBooks(db: Db = getDb()): Book[] {
  const rows = db
    .prepare(
      `SELECT b.url, b.title, b.image_url, b.categories_json, l.tweet_id, w.thread_id, t.author_handle
       FROM books b
       LEFT JOIN links l ON l.url = b.url
       LEFT JOIN tweets w ON w.id = l.tweet_id
       LEFT JOIN threads t ON t.id = w.thread_id
       ORDER BY b.url, l.tweet_id`,
    )
    .all() as Row[];

  const books = new Map<string, Book>();
  for (const row of rows) {
    const url = str(row.url);
    const book = books.get(url) ?? {
      url,
      title: str(row.title),
      imageUrl: optStr(row.image_url),
      categories: JSON.parse(str(row.categories_json)) as string[],
      mentions: [],
    };
    if (row.tweet_id && row.thread_id) {
      book.mentions.push({ tweetId: str(row.tweet_id), threadId: str(row.thread_id), authorHandle: str(row.author_handle) });
    }
    books.set(url, book);
  }
  // Most recently mentioned first
  const latest = (book: Book) => book.mentions.reduce((max, m) => (BigInt(m.tweetId) > max ? BigInt(m.tweetId) : max), 0n);
  return [...books.values()].sort((a, b) => (latest(b) > latest(a) ? 1 : latest(b) < latest(a) ? -1 : 0));
}

export function listGlossary(db: Db = getDb()): GlossaryTerm[] {
  return (db.prepare('SELECT term, definition, reference FROM glossary ORDER BY term COLLATE NOCASE').all() as Row[]).map(
    (row) => ({ term: str(row.term), definition: str(row.definition), reference: optStr(row.reference) }),
  );
}

export interface GraphNode {
  id: string;
  title: string;
  category: string | null; // primary category name
  views: number;
  likes: number;
  replies: number;
  bookmarks: number;
}

/** Threads as nodes; an edge means a tweet of `source` quotes a tweet of `target`. */
export function getGraph(db: Db = getDb()): { nodes: GraphNode[]; edges: { source: string; target: string }[] } {
  const nodes = (
    db
      .prepare(
        `SELECT t.id, t.title, c.name AS category, w.views, w.likes, w.replies, w.bookmarks
         FROM threads t
         JOIN tweets w ON w.id = t.id
         LEFT JOIN thread_categories tc ON tc.thread_id = t.id AND tc.position = 0
         LEFT JOIN categories c ON c.slug = tc.category_slug
         ORDER BY t.published_at`,
      )
      .all() as Row[]
  ).map((row) => ({
    id: str(row.id),
    title: str(row.title),
    category: optStr(row.category),
    views: Number(row.views),
    likes: Number(row.likes),
    replies: Number(row.replies),
    bookmarks: Number(row.bookmarks),
  }));

  const edges = (
    db
      .prepare(
        `SELECT DISTINCT quoting.thread_id AS source, quoted.thread_id AS target
         FROM quotes q
         JOIN tweets quoting ON quoting.id = q.tweet_id
         JOIN tweets quoted ON quoted.id = q.quoted_id
         WHERE quoting.thread_id <> quoted.thread_id
         ORDER BY source, target`,
      )
      .all() as Row[]
  ).map((row) => ({ source: str(row.source), target: str(row.target) }));

  return { nodes, edges };
}
