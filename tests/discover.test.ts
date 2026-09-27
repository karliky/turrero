import { beforeEach, describe, expect, test } from 'vitest';
import { migrate, openDb, type Db } from '../lib/db';
import { findTurras, looksLikeTurra, madridDayRange, weekdaysBetween, SATURDAY } from '../lib/discover';
import { insertThread, replaceTweets, upsertAuthor } from '../lib/store';
import type { PostSummary, XClient, XThread } from '../lib/x';
import type { Tweet } from '../lib/types';

describe('Saturday windows in Madrid time', () => {
  test('lists the Saturdays strictly after the last turra', () => {
    expect(weekdaysBetween(new Date('2026-02-14T07:37:17Z'), new Date('2026-03-10T12:00:00Z'), SATURDAY)).toEqual([
      '2026-02-21',
      '2026-02-28',
      '2026-03-07',
    ]);
  });

  test('uses UTC+1 in winter and UTC+2 in summer', () => {
    expect(madridDayRange('2026-02-21')).toEqual({ startTime: '2026-02-20T23:00:00.000Z', endTime: '2026-02-21T23:00:00.000Z' });
    expect(madridDayRange('2026-07-04')).toEqual({ startTime: '2026-07-03T22:00:00.000Z', endTime: '2026-07-04T22:00:00.000Z' });
  });
});

function tweet(id: string): Tweet {
  return {
    id,
    text: `tweet ${id}`,
    createdAt: '2026-02-21T08:00:00.000Z',
    stats: { likes: 0, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 },
    media: [],
    links: [],
    quote: null,
  };
}

const author = { handle: 'Recuenco', name: 'Javier G. Recuenco', xUserId: '1', avatarUrl: null };

function threadOf(rootId: string, length: number, handle = 'Recuenco'): XThread {
  const tweets = Array.from({ length }, (_, i) => tweet(String(BigInt(rootId) + BigInt(i))));
  return { author: { ...author, handle }, tweets, warnings: [] };
}

/** Fake X: posts per search window and threads by root id. */
function fakeX(postsByDay: Record<string, PostSummary[]>, threads: Record<string, XThread>): XClient & { searches: string[] } {
  const searches: string[] = [];
  return {
    searches,
    async searchPosts(query, range) {
      searches.push(`${query} ${range.startTime}`);
      const day = Object.keys(postsByDay).find((d) => madridDayRange(d).startTime === range.startTime);
      return day ? postsByDay[day]! : [];
    },
    async fetchThread(id) {
      const thread = threads[id];
      if (!thread) throw new Error('Could not find tweet');
      return thread;
    },
  };
}

const post = (id: string, conversationId = id): PostSummary => ({
  id,
  createdAt: '2026-02-21T08:00:00.000Z',
  text: `En el hilo turras de hoy ${id}\nsegunda línea`,
  conversationId,
});

test('recognizes how turras are announced', () => {
  for (const text of ['En el hilo turras de hoy, vamos a…', 'Bueno, chicos, pues hoy mini hilo turras', 'Welcome back my friends. Otra temporada de hilos turras', 'Nuevo 🧵']) {
    expect(looksLikeTurra(text)).toBe(true);
  }
  expect(looksLikeTurra('SAY IT LOUDER.')).toBe(false);
});

describe('findTurras', () => {
  let db: Db;

  beforeEach(() => {
    db = openDb(':memory:');
    migrate(db);
    upsertAuthor(db, author);
    insertThread(db, { id: '100', authorHandle: 'Recuenco', title: 'Última', publishedAt: '2026-02-14T07:37:17.000Z', exam: null, podcastUrl: null, syncedAt: null });
    replaceTweets(db, '100', [tweet('100')]);
  });

  test('keeps Saturday threads of the author and explains every discarded post', async () => {
    const x = fakeX(
      {
        '2026-02-21': [post('3000'), post('2000'), post('2000'), post('2500', '100')],
        '2026-02-28': [post('4000'), post('5000'), { ...post('6000'), text: 'Una foto del desayuno' }],
      },
      { '2000': threadOf('2000', 40), '3000': threadOf('3000', 3), '4000': threadOf('4000', 20, 'otro') },
    );

    const candidates = await findTurras(db, x, { handle: 'Recuenco', until: new Date('2026-03-01T12:00:00Z') });

    expect(x.searches).toEqual([
      'from:Recuenco -is:reply -is:retweet 2026-02-20T23:00:00.000Z',
      'from:Recuenco -is:reply -is:retweet 2026-02-27T23:00:00.000Z',
    ]);
    expect(candidates.map((c) => [c.id, c.tweets, c.rejection])).toEqual([
      ['2000', 40, null],
      ['2500', null, 'not the start of a conversation'],
      ['3000', 3, 'only 3 tweet(s)'],
      ['4000', 20, 'written by @otro'],
      ['5000', null, 'could not fetch the thread: Could not find tweet'],
      ['6000', null, 'does not mention "hilo" or "turra"'],
    ]);
    expect(candidates[0]!.firstLine).toBe('En el hilo turras de hoy 2000');
  });

  test('skips turras that are already archived', async () => {
    const x = fakeX({ '2026-02-21': [post('100')] }, {});
    const candidates = await findTurras(db, x, {
      handle: 'Recuenco',
      since: new Date('2026-02-01T00:00:00Z'),
      until: new Date('2026-02-22T00:00:00Z'),
    });
    expect(candidates.find((c) => c.id === '100')?.rejection).toBe('already in the database');
  });

  test('needs a starting date for authors without turras', async () => {
    await expect(findTurras(db, fakeX({}, {}), { handle: 'nadie' })).rejects.toThrow(/--since/);
  });
});
