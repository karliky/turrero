import { beforeAll, describe, expect, test } from 'vitest';
import { migrate, openDb, rebuildSearch, type Db } from '../lib/db';
import {
  getGraph,
  getThread,
  getThreadIdOfTweet,
  listBooks,
  listThreadsByAuthor,
  listThreadsByCategory,
  listThreadsNotByAuthor,
  listTopByEngagement,
  search,
} from '../lib/queries';
import { insertThread, replaceTweets, setThreadCategories, upsertAuthor, upsertBook } from '../lib/store';
import type { Tweet } from '../lib/types';
import { topics } from '../app/hall-of-fame/topics';

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
  db.prepare("INSERT INTO categories VALUES ('estrategia', 'Estrategia', 'desc', 0), ('gaming', 'Gaming', 'desc', 1)").run();
  upsertAuthor(db, { handle: 'Recuenco', name: 'Javier G. Recuenco', xUserId: null, avatarUrl: null });
  upsertAuthor(db, { handle: 'otra', name: 'Otra Autora', xUserId: '42', avatarUrl: null });

  const threads = [
    { id: '100', author: 'Recuenco', date: '2024-01-01', likes: 10, categories: ['estrategia'] },
    { id: '200', author: 'Recuenco', date: '2024-02-01', likes: 50, categories: ['estrategia', 'gaming'] },
    { id: '300', author: 'otra', date: '2024-03-01', likes: 5, categories: ['gaming'] },
  ];
  for (const t of threads) {
    insertThread(db, { id: t.id, authorHandle: t.author, title: `Turra ${t.id}`, publishedAt: `${t.date}T00:00:00.000Z`, exam: null, podcastUrl: null, syncedAt: null });
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

  test('lists by category, author and engagement', () => {
    expect(listThreadsByCategory('gaming', db).map((t) => t.id)).toEqual(['300', '200']);
    expect(listThreadsByAuthor('otra', db).map((t) => t.id)).toEqual(['300']);
    expect(listThreadsNotByAuthor('Recuenco', db).map((t) => t.authorName)).toEqual(['Otra Autora']);
    expect(listTopByEngagement(2, db).map((t) => t.id)).toEqual(['200', '100']);
  });

  test('search is accent-insensitive, prefix-based and safe with quotes', () => {
    expect(search('resolucion', 20, db).map((r) => r.threadId)).toEqual(['100']);
    expect(search('estrat', 20, db).map((r) => r.threadId)).toEqual(['200']);
    expect(search('"comillas', 20, db)[0]?.tweetId).toBe('200');
    expect(search('', 20, db)).toEqual([]);
  });

  test('graph links threads through quotes', () => {
    const graph = getGraph(db);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toEqual([{ source: '200', target: '100' }]);
  });

  test('books know which tweets mention them', () => {
    expect(listBooks(db)).toEqual([
      {
        url: 'https://www.goodreads.com/book/show/1',
        title: 'Libro',
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

test('every hall of fame turra exists in the committed database', () => {
  const db = openDb(undefined, { readOnly: true });
  const ids = topics.flatMap((topic) => topic.articles.map((article) => article.id));
  const missing = ids.filter((id) => !getThread(id, db));
  expect(missing).toEqual([]);
});
