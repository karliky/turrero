// Link preview images from X (pbs.twimg.com/news_img/…) expire after a while, so they are
// downloaded once and served from public/metadata/, like the rest of the archived media.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tweet } from './types';

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export type ImageStore = (tweets: Tweet[]) => Promise<{ tweets: Tweet[]; warnings: string[] }>;

export function createImageStore({
  dir = join(process.cwd(), 'public', 'metadata'),
  fetch: fetchFn = fetch,
}: { dir?: string; fetch?: typeof fetch } = {}): ImageStore {
  const downloaded = new Map<string, string | null>();

  async function localize(url: string): Promise<string | null> {
    if (downloaded.has(url)) return downloaded.get(url)!;
    const name = `link-${createHash('sha256').update(url).digest('hex').slice(0, 16)}`;
    let result: string | null = null;
    try {
      const response = await fetchFn(url);
      const extension = EXTENSIONS[response.headers.get('content-type')?.split(';')[0] ?? ''];
      if (response.ok && extension) {
        const file = `${name}.${extension}`;
        if (!existsSync(join(dir, file))) {
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, file), Buffer.from(await response.arrayBuffer()));
        }
        result = `/metadata/${file}`;
      }
    } catch {
      result = null;
    }
    downloaded.set(url, result);
    return result;
  }

  return async (tweets) => {
    const warnings: string[] = [];
    const localized: Tweet[] = [];
    for (const tweet of tweets) {
      const links = [];
      for (const link of tweet.links) {
        if (!link.imageUrl?.startsWith('http')) {
          links.push(link);
          continue;
        }
        const imageUrl = await localize(link.imageUrl);
        if (!imageUrl) warnings.push(`Link image of ${link.url} is no longer available; card kept without image`);
        links.push({ ...link, imageUrl });
      }
      localized.push({ ...tweet, links });
    }
    return { tweets: localized, warnings };
  };
}
