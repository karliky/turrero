import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createImageStore } from '../lib/images';
import type { Tweet } from '../lib/types';

function tweetWithLinks(...images: (string | null)[]): Tweet {
  return {
    id: '1',
    text: 't',
    createdAt: '2026-01-01T00:00:00.000Z',
    stats: { likes: 0, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 },
    media: [],
    links: images.map((imageUrl, i) => ({ url: `https://example.com/${i}`, domain: 'example.com', title: null, description: null, imageUrl })),
    quote: null,
  };
}

test('downloads link images once and serves them locally; expired ones are dropped', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'turrero-images-'));
  const fetch = vi.fn(async (input: string | URL | Request) =>
    String(input).includes('expired')
      ? new Response('', { status: 404 })
      : new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }),
  );
  const store = createImageStore({ dir, fetch });

  const { tweets, warnings } = await store([
    tweetWithLinks('https://pbs.twimg.com/news_img/1/a?format=jpg', 'https://pbs.twimg.com/news_img/2/expired', '/metadata/local.jpg', null),
    tweetWithLinks('https://pbs.twimg.com/news_img/1/a?format=jpg'),
  ]);

  const [first, expired, local, none] = tweets[0]!.links.map((l) => l.imageUrl);
  expect(first).toMatch(/^\/metadata\/link-[0-9a-f]{16}\.jpg$/);
  expect(existsSync(join(dir, first!.slice('/metadata/'.length)))).toBe(true);
  expect(expired).toBeNull();
  expect(local).toBe('/metadata/local.jpg');
  expect(none).toBeNull();
  expect(tweets[1]!.links[0]!.imageUrl).toBe(first);
  expect(fetch).toHaveBeenCalledTimes(2); // same URL downloaded once
  expect(warnings).toHaveLength(1);
});
