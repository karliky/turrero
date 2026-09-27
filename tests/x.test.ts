import { describe, expect, test, vi } from 'vitest';
import { createXClient, normalizeThread, XApiError } from '../lib/x';
import { rootResponse, searchPage1, searchPage2 } from './fixtures/x-thread';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

/** Fake fetch that serves the fixtures by URL. */
function fixtureFetch(overrides: (url: URL) => Response | undefined = () => undefined) {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(String(input));
    const override = overrides(url);
    if (override) return override;
    if (url.pathname === '/2/tweets/1000') return jsonResponse(rootResponse);
    if (url.pathname === '/2/tweets/1003') return jsonResponse({ ...rootResponse, data: { ...searchPage1.data![1]! } });
    if (url.pathname === '/2/tweets/search/all') {
      return jsonResponse(url.searchParams.get('pagination_token') === 'page2' ? searchPage2 : searchPage1);
    }
    return jsonResponse({ errors: [{ title: 'Not Found Error', type: 'https://api.x.com/2/problems/resource-not-found' }] }, 404);
  });
}

const noSleep = async (_ms: number) => {};

describe('normalizeThread', () => {
  const thread = normalizeThread(rootResponse, [searchPage1, searchPage2]);

  test('keeps only the chain of self-replies, in order', () => {
    expect(thread.tweets.map((t) => t.id)).toEqual(['1000', '1001', '1002', '1005']);
    expect(thread.warnings).toEqual(['Tweet 1003 branches off the thread (replies to 1001); skipped']);
  });

  test('maps the author', () => {
    expect(thread.author).toEqual({
      handle: 'autora',
      name: 'La Autora',
      xUserId: '1',
      avatarUrl: 'https://pbs.twimg.com/profile_images/1/a.jpg',
    });
  });

  test('expands links and removes attachment links from the text', () => {
    const [root, long] = thread.tweets;
    expect(root!.text).toBe('Hoy hablamos de un libro https://www.goodreads.com/book/show/1-libro');
    expect(long!.text).toBe('Texto largo completo de más de 280 caracteres');
  });

  test('builds link cards from url entities', () => {
    expect(thread.tweets[0]!.links).toEqual([
      {
        url: 'https://www.goodreads.com/book/show/1-libro',
        domain: 'goodreads.com',
        title: 'El Libro',
        description: 'Una descripción',
        imageUrl: 'https://pbs.twimg.com/news_img/1.jpg',
      },
    ]);
    expect(thread.tweets[1]!.links).toEqual([]);
  });

  test('maps photos, gifs and videos (best mp4 variant)', () => {
    expect(thread.tweets[0]!.media).toEqual([{ kind: 'photo', url: 'https://pbs.twimg.com/media/foto.jpg', posterUrl: null, alt: 'Una foto' }]);
    expect(thread.tweets[2]!.media).toEqual([
      { kind: 'gif', url: 'https://video.twimg.com/tweet_video/gif.mp4', posterUrl: 'https://pbs.twimg.com/tweet_video_thumb/gif.jpg', alt: null },
    ]);
    expect(thread.tweets[3]!.media[0]).toMatchObject({ kind: 'video', url: 'https://video.twimg.com/ext_tw_video/7/vid/high.mp4' });
  });

  test('resolves quoted tweets with their author', () => {
    expect(thread.tweets[1]!.quote).toEqual({
      quotedId: '555',
      authorHandle: 'citado',
      authorName: 'Persona Citada',
      text: 'El tweet citado',
      media: [],
    });
  });

  test('maps public metrics', () => {
    expect(thread.tweets[0]!.stats).toEqual({ likes: 10, retweets: 2, replies: 1, quotes: 1, bookmarks: 3, views: 500 });
    expect(thread.tweets[3]!.stats.views).toBe(0);
  });
});

describe('createXClient', () => {
  test('fetches the root and every page of the conversation', async () => {
    const fetch = fixtureFetch();
    const sleep = vi.fn(noSleep);
    const thread = await createXClient({ bearerToken: 'token', fetch, sleep }).fetchThread('1000');

    expect(thread.tweets).toHaveLength(4);
    const urls = fetch.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls.map((u) => u.pathname)).toEqual(['/2/tweets/1000', '/2/tweets/search/all', '/2/tweets/search/all']);
    expect(urls[1]!.searchParams.get('query')).toBe('conversation_id:1000 from:autora');
    expect(sleep).toHaveBeenCalledWith(1000);
    expect(fetch.mock.calls[0]![1]).toMatchObject({ headers: { Authorization: 'Bearer token' } });
  });

  test('starts from the conversation root when given a later tweet', async () => {
    const thread = await createXClient({ bearerToken: 't', fetch: fixtureFetch(), sleep: noSleep }).fetchThread('1003');
    expect(thread.tweets[0]!.id).toBe('1000');
  });

  test('waits for the rate limit reset and retries', async () => {
    let limited = true;
    const fetch = fixtureFetch((url) => {
      if (url.pathname === '/2/tweets/1000' && limited) {
        limited = false;
        return jsonResponse({ title: 'Too Many Requests' }, 429, { 'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 30) });
      }
      return undefined;
    });
    const sleep = vi.fn(noSleep);
    const thread = await createXClient({ bearerToken: 't', fetch, sleep }).fetchThread('1000');
    expect(thread.tweets).toHaveLength(4);
    expect(sleep.mock.calls[0]![0]).toBeGreaterThan(20_000);
  });

  test('reports deleted tweets as not found', async () => {
    const client = createXClient({ bearerToken: 't', fetch: fixtureFetch(), sleep: noSleep });
    const error = await client.fetchThread('404').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(XApiError);
    expect((error as XApiError).isNotFound).toBe(true);
  });

  test('reports errors returned with status 200 (e.g. protected account)', async () => {
    const fetch = fixtureFetch((url) =>
      url.pathname === '/2/tweets/2000'
        ? jsonResponse({
            errors: [{ detail: 'Sorry, you are not authorized to see the Tweet with id: [2000].', type: 'https://api.x.com/2/problems/not-authorized-for-resource' }],
          })
        : undefined,
    );
    const error = (await createXClient({ bearerToken: 't', fetch, sleep: noSleep }).fetchThread('2000').catch((e: unknown) => e)) as XApiError;
    expect(error.message).toContain('not authorized');
    expect(error.problemType).toContain('not-authorized-for-resource');
  });

  test('fails when the author is missing from the response', async () => {
    const fetch = fixtureFetch((url) =>
      url.pathname === '/2/tweets/1000' ? jsonResponse({ ...rootResponse, includes: { users: [] } }) : undefined,
    );
    await expect(createXClient({ bearerToken: 't', fetch, sleep: noSleep }).fetchThread('1000')).rejects.toThrow(/Author/);
  });
});
