import { beforeAll, describe, expect, test } from 'vitest';
import { migrate, openDb, rebuildSearch, type Db } from '../lib/db';
import {
  getAdjacentThreads,
  getThread,
  getThreadCitations,
  getThreadIdOfTweet,
  listBooks,
  listCitations,
  listThreadsByCategory,
  listThreadsForArchive,
  listTopByEngagement,
  search,
} from '../lib/queries';
import { insertThread, replaceTweets, setThreadCategories, upsertAuthor, upsertBook } from '../lib/store';
import type { Tweet } from '../lib/types';
import { attractors, guide, pillars } from '../app/empieza-aqui/guia';

function tweet(id: string, text: string, extra: Partial<Tweet> = {}): Tweet {
  return {
    id,
    text,
    createdAt: '2024-01-01T00:00:00.000Z',
    stats: { likes: 0, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 },
    media: [],
    links: [],
    quote: null,
    ...extra,
  };
}

function seed(db: Db): void {
  db.prepare("INSERT INTO categories (slug, name, description, position) VALUES ('estrategia', 'Estrategia', 'desc', 0), ('gaming', 'Gaming', 'desc', 1)").run();
  upsertAuthor(db, { handle: 'Recuenco', name: 'Javier G. Recuenco', xUserId: null, avatarUrl: null });
  upsertAuthor(db, { handle: 'otra', name: 'Otra Autora', xUserId: '42', avatarUrl: null });

  const threads = [
    { id: '100', author: 'Recuenco', date: '2024-01-01', likes: 10, categories: ['estrategia'] },
    { id: '200', author: 'Recuenco', date: '2024-02-01', likes: 50, categories: ['estrategia', 'gaming'] },
    { id: '300', author: 'otra', date: '2024-03-01', likes: 5, categories: ['gaming'] },
  ];
  for (const t of threads) {
    insertThread(db, { id: t.id, authorHandle: t.author, title: `Turra ${t.id}`, publishedAt: `${t.date}T00:00:00.000Z`, exam: null, syncedAt: null });
    setThreadCategories(db, t.id, t.categories);
  }
  replaceTweets(db, '100', [
    tweet('100', 'Resolución de problemas complejos', { stats: { likes: 10, retweets: 1, replies: 0, quotes: 0, bookmarks: 0, views: 0 } }),
    tweet('101', 'Un libro recomendado', {
      links: [{ url: 'https://www.goodreads.com/book/show/1', domain: 'goodreads.com', title: 'Libro', description: null, imageUrl: null }],
    }),
  ]);
  replaceTweets(db, '200', [
    tweet('200', 'Estrategia y "comillas"', { stats: { likes: 50, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 } }),
    tweet('201', 'Cita a otra turra', {
      quote: { quotedId: '101', authorHandle: 'Recuenco', authorName: 'Javier G. Recuenco', text: 'Un libro recomendado', media: [] },
    }),
  ]);
  replaceTweets(db, '300', [tweet('300', 'Gaming', { stats: { likes: 5, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 } })]);
  upsertBook(db, { url: 'https://www.goodreads.com/book/show/1', title: 'Libro', imageUrl: null, categories: ['Negocios y empresa'] });
  rebuildSearch(db);
}

describe('queries', () => {
  let db: Db;

  beforeAll(() => {
    db = openDb(':memory:');
    migrate(db);
    seed(db);
  });

  test('getThread returns ordered tweets with author, categories and relations', () => {
    const thread = getThread('200', db)!;
    expect(thread.author.name).toBe('Javier G. Recuenco');
    expect(thread.categories.map((c) => c.slug)).toEqual(['estrategia', 'gaming']);
    expect(thread.tweets.map((t) => t.id)).toEqual(['200', '201']);
    expect(thread.tweets[1]!.quote?.quotedId).toBe('101');
    expect(getThread('999', db)).toBeNull();
  });

  test('citations link a turra to the older turra it quotes, in both directions', () => {
    expect(listCitations(db)).toEqual([{ from: '200', to: '100' }]);
    expect(getThreadCitations('100', db)).toMatchObject({ cites: [], citedBy: [{ id: '200' }] });
    expect(getThreadCitations('200', db)).toMatchObject({ cites: [{ id: '100' }], citedBy: [] });
    expect(getThreadCitations('300', db)).toEqual({ cites: [], citedBy: [] });
  });

  test('lists by category, author and engagement', () => {
    expect(listThreadsByCategory('gaming', db).map((t) => t.id)).toEqual(['300', '200']);
    expect(listTopByEngagement(2, db).map((t) => t.id)).toEqual(['200', '100']);
  });

  test('the archive lists every turra with its category slugs, newest first', () => {
    expect(listThreadsForArchive(db).map((t) => [t.id, t.authorName, t.categories])).toEqual([
      ['300', 'Otra Autora', ['gaming']],
      ['200', 'Javier G. Recuenco', ['estrategia', 'gaming']],
      ['100', 'Javier G. Recuenco', ['estrategia']],
    ]);
  });

  test('adjacent turras are the chronological neighbours', () => {
    const ids = (id: string) => {
      const { previous, next } = getAdjacentThreads(id, db);
      return [previous?.id ?? null, next?.id ?? null];
    };
    expect(ids('200')).toEqual(['100', '300']);
    expect(ids('100')).toEqual([null, '200']);
    expect(ids('300')).toEqual(['200', null]);
  });

  test('search is accent-insensitive, prefix-based and safe with quotes', () => {
    expect(search('resolucion', 20, db).map((r) => r.threadId)).toEqual(['100']);
    expect(search('estrat', 20, db).map((r) => r.threadId)).toEqual(['200']);
    expect(search('"comillas', 20, db)[0]?.tweetId).toBe('200');
    expect(search('', 20, db)).toEqual([]);
    expect(search('a', 20, db)).toEqual([]);
    expect(search('y estrat', 20, db).map((r) => r.threadId)).toEqual(['200']);
  });

  test('books know which tweets mention them', () => {
    expect(listBooks(db)).toEqual([
      {
        url: 'https://www.goodreads.com/book/show/1',
        title: 'Libro',
        author: null,
        imageUrl: null,
        categories: ['Negocios y empresa'],
        mentions: [{ tweetId: '101', threadId: '100', authorHandle: 'Recuenco' }],
      },
    ]);
  });

  test('finds the thread of any tweet', () => {
    expect(getThreadIdOfTweet('201', db)).toBe('200');
    expect(getThreadIdOfTweet('999', db)).toBeNull();
  });
});

test('every turra of the reading guide exists, once per series, and its quotes (pillars included) are literal', () => {
  const db = openDb(undefined, { readOnly: true });
  const ids = [...guide.path.map((step) => step.id), ...guide.series.flatMap((s) => s.parts.map((part) => part.id))];
  expect(ids.filter((id) => !getThread(id, db))).toEqual([]);
  for (const s of guide.series) expect(new Set(s.parts.map((p) => p.id)).size, s.slug).toBe(s.parts.length);
  const quotes = [
    ...guide.path,
    pillars.intro,
    pillars.attractors,
    ...pillars.items.map((pillar) => ({ id: pillars.threadId, tweetId: pillar.tweetId, quote: pillar.quote })),
    attractors.intro,
    ...attractors.changes.map((change) => ({ id: attractors.threadId, tweetId: change.tweetId, quote: change.quote })),
    ...attractors.changes.flatMap((change) => (change.beforeSource ? [change.beforeSource] : [])),
  ];
  for (const step of quotes) {
    const tweet = db.prepare('SELECT thread_id, text FROM tweets WHERE id = ?').get(step.tweetId) as { thread_id: string; text: string };
    expect(tweet.thread_id, step.id).toBe(step.id);
    expect(tweet.text, step.id).toContain(step.quote);
  }
});
