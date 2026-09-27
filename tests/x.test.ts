import { describe, expect, test, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileCache } from '../lib/cache';
import { createXClient, createXClientFromEnv, fetchBearerToken, normalizeThread, XApiError } from '../lib/x';
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
    expect(urls[1]!.searchParams.get('query')).toBe('conversation_id:1000 from:autora to:autora');
    // 1 request per second between search pages
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0]![0]).toBeGreaterThan(900);
    expect(fetch.mock.calls[0]![1]).toMatchObject({ headers: { Authorization: 'Bearer token' } });
  });

  test('rebuilds old threads from the author posts of that day when conversation search finds nothing', async () => {
    const fetch = fixtureFetch((url) => {
      if (url.pathname !== '/2/tweets/search/all') return undefined;
      const query = url.searchParams.get('query')!;
      if (query.startsWith('conversation_id:')) return jsonResponse({ meta: { result_count: 0 } });
      // from:autora during the day of the root tweet: the thread plus unrelated posts
      expect(query).toBe('from:autora to:autora');
      expect(url.searchParams.get('start_time')).toBe('2024-05-01T00:00:00.000Z');
      return jsonResponse({ ...searchPage1, data: [...searchPage1.data!, ...searchPage2.data!], includes: { ...searchPage1.includes, media: [...searchPage1.includes!.media!, ...searchPage2.includes!.media!] }, meta: {} });
    });
    const thread = await createXClient({ bearerToken: 't', fetch, sleep: noSleep }).fetchThread('1000');
    expect(thread.tweets.map((t) => t.id)).toEqual(['1000', '1001', '1002', '1005']);
    expect(thread.warnings[0]).toMatch(/rebuilt/);
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

  test('retries transient server errors', async () => {
    let failures = 2;
    const fetch = fixtureFetch((url) => (url.pathname === '/2/tweets/1000' && failures-- > 0 ? jsonResponse({ title: 'Service Unavailable' }, 503) : undefined));
    const sleep = vi.fn(noSleep);
    const thread = await createXClient({ bearerToken: 't', fetch, sleep }).fetchThread('1000');
    expect(thread.tweets).toHaveLength(4);
    expect(sleep.mock.calls.slice(0, 2).map(([ms]) => ms)).toEqual([5_000, 15_000]);
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

describe('response cache', () => {
  const tempCache = (options = {}) => createFileCache(mkdtempSync(join(tmpdir(), 'turrero-cache-')), options);

  test('never pays twice for the same request', async () => {
    const cache = tempCache();
    const fetch = fixtureFetch();
    await createXClient({ bearerToken: 't', fetch, sleep: noSleep, cache }).fetchThread('1000');
    expect(fetch).toHaveBeenCalledTimes(3);

    const secondFetch = fixtureFetch();
    const thread = await createXClient({ bearerToken: 't', fetch: secondFetch, sleep: noSleep, cache }).fetchThread('1000');
    expect(secondFetch).not.toHaveBeenCalled();
    expect(thread.tweets).toHaveLength(4);
  });

  test('refresh skips cached responses but stores the new ones', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'turrero-cache-'));
    await createXClient({ bearerToken: 't', fetch: fixtureFetch(), sleep: noSleep, cache: createFileCache(dir) }).fetchThread('1000');

    const fetch = fixtureFetch();
    await createXClient({ bearerToken: 't', fetch, sleep: noSleep, cache: createFileCache(dir, { refresh: true }) }).fetchThread('1000');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test('does not cache errors', async () => {
    const cache = tempCache();
    const client = createXClient({ bearerToken: 't', fetch: fixtureFetch(), sleep: noSleep, cache });
    await expect(client.fetchThread('404')).rejects.toThrow();
    const fetch = fixtureFetch();
    await expect(createXClient({ bearerToken: 't', fetch, sleep: noSleep, cache }).fetchThread('404')).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('credentials', () => {
  test('exchanges API key and secret for a bearer token', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => jsonResponse({ token_type: 'bearer', access_token: 'app-token' }));
    expect(await fetchBearerToken('key', 'secret', fetch)).toBe('app-token');
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe('https://api.x.com/oauth2/token');
    expect(init).toMatchObject({ method: 'POST', body: 'grant_type=client_credentials' });
    expect((init!.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('key:secret').toString('base64')}`);
  });

  test('reports rejected credentials', async () => {
    const fetch = vi.fn(async () => jsonResponse({ errors: [{ code: 99, message: 'Unable to verify your credentials' }] }, 403));
    await expect(fetchBearerToken('key', 'bad', fetch)).rejects.toBeInstanceOf(XApiError);
  });

  test('requires some X credentials', async () => {
    await expect(createXClientFromEnv(undefined, {})).rejects.toThrow(/X_API_KEY/);
  });
});
