// Client for the official X API v2 (https://docs.x.com). App-only auth with a bearer token.
// fetchThread() downloads a thread; normalizeThread() turns the raw responses into the domain model.
import type { Author, Link, Media, Quote, Tweet } from './types';

const API_URL = 'https://api.x.com/2';
const MAX_RATE_LIMIT_RETRIES = 3;

const PARAMS = {
  'tweet.fields':
    'created_at,author_id,conversation_id,in_reply_to_user_id,referenced_tweets,entities,attachments,note_tweet,public_metrics',
  expansions: 'author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id',
  'media.fields': 'type,url,preview_image_url,variants,alt_text',
  'user.fields': 'username,name,profile_image_url',
};

// ---------------------------------------------------------------------------
// Raw API shapes (only the fields we use). X is renaming "tweet" to "post" in
// some payloads, so both spellings are accepted.
// ---------------------------------------------------------------------------

interface RawUrlEntity {
  url: string;
  expanded_url?: string;
  unwound_url?: string;
  media_key?: string;
  title?: string;
  description?: string;
  images?: { url: string }[];
}

interface RawReference {
  type: 'replied_to' | 'quoted' | 'retweeted';
  id: string;
}

interface RawNote {
  text: string;
  entities?: { urls?: RawUrlEntity[] };
}

export interface RawTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  conversation_id: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: RawReference[];
  referenced_posts?: RawReference[];
  entities?: { urls?: RawUrlEntity[] };
  attachments?: { media_keys?: string[] };
  note_tweet?: RawNote;
  note_post?: RawNote;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    impression_count?: number;
  };
}

interface RawMedia {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
  variants?: { bit_rate?: number; content_type: string; url: string }[];
}

interface RawUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface RawProblem {
  title?: string;
  detail?: string;
  type?: string;
  resource_id?: string;
}

export interface RawResponse<T> {
  data?: T;
  includes?: { users?: RawUser[]; media?: RawMedia[]; tweets?: RawTweet[]; posts?: RawTweet[] };
  errors?: RawProblem[];
  meta?: { next_token?: string };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class XApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly problemType: string | null = null,
  ) {
    super(message);
    this.name = 'XApiError';
  }

  get isNotFound(): boolean {
    return this.status === 404 || !!this.problemType?.endsWith('/resource-not-found');
  }
}

function problemToError(problem: RawProblem, status: number): XApiError {
  const type = problem.type ?? null;
  const notFound = type?.endsWith('/resource-not-found');
  return new XApiError(problem.detail ?? problem.title ?? 'X API error', notFound ? 404 : status, type);
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface XThread {
  author: Author;
  tweets: Tweet[];
  warnings: string[];
}

export interface XClient {
  fetchThread(tweetId: string): Promise<XThread>;
}

export interface XClientOptions {
  bearerToken: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export function createXClient({ bearerToken, fetch: fetchFn = fetch, sleep = defaultSleep }: XClientOptions): XClient {
  async function get<T>(path: string, params: Record<string, string>): Promise<RawResponse<T>> {
    const url = `${API_URL}${path}?${new URLSearchParams(params)}`;
    for (let attempt = 0; ; attempt++) {
      const response = await fetchFn(url, { headers: { Authorization: `Bearer ${bearerToken}` } });
      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const reset = Number(response.headers.get('x-rate-limit-reset'));
        const waitMs = Number.isFinite(reset) && reset > 0 ? Math.max(reset * 1000 - Date.now(), 1000) : 60_000;
        await sleep(Math.min(waitMs, 15 * 60_000));
        continue;
      }
      const body = (await response.json().catch(() => ({}))) as RawResponse<T> & RawProblem;
      if (!response.ok) {
        throw problemToError(body.errors?.[0] ?? body, response.status);
      }
      return body;
    }
  }

  async function getTweet(id: string): Promise<RawResponse<RawTweet>> {
    const response = await get<RawTweet>(`/tweets/${id}`, PARAMS);
    if (!response.data) {
      throw problemToError(response.errors?.[0] ?? { detail: `Tweet ${id} not found` }, 404);
    }
    return response;
  }

  return {
    async fetchThread(tweetId) {
      let root = await getTweet(tweetId);
      if (root.data!.conversation_id !== root.data!.id) {
        root = await getTweet(root.data!.conversation_id);
      }
      const username = root.includes?.users?.find((u) => u.id === root.data!.author_id)?.username;
      if (!username) throw new XApiError(`Author of tweet ${root.data!.id} not found`, 404);

      // Full-archive search returns the whole conversation regardless of its age
      const pages: RawResponse<RawTweet[]>[] = [];
      let nextToken: string | undefined;
      do {
        if (pages.length > 0) await sleep(1000); // endpoint limit: 1 request per second
        const page = await get<RawTweet[]>('/tweets/search/all', {
          ...PARAMS,
          query: `conversation_id:${root.data!.id} from:${username}`,
          max_results: '500',
          ...(nextToken ? { pagination_token: nextToken } : {}),
        });
        pages.push(page);
        nextToken = page.meta?.next_token;
      } while (nextToken);

      return normalizeThread(root, pages);
    },
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Normalization: raw API responses -> domain model
// ---------------------------------------------------------------------------

const references = (tweet: RawTweet): RawReference[] => tweet.referenced_tweets ?? tweet.referenced_posts ?? [];
const note = (tweet: RawTweet): RawNote | undefined => tweet.note_tweet ?? tweet.note_post;

export function normalizeThread(root: RawResponse<RawTweet>, pages: RawResponse<RawTweet[]>[]): XThread {
  const rootTweet = root.data;
  if (!rootTweet) throw new XApiError('Missing root tweet', 404);

  const responses = [root, ...pages];
  const users = new Map(responses.flatMap((r) => r.includes?.users ?? []).map((u) => [u.id, u]));
  const media = new Map(responses.flatMap((r) => r.includes?.media ?? []).map((m) => [m.media_key, m]));
  const included = new Map(
    responses.flatMap((r) => [...(r.includes?.tweets ?? []), ...(r.includes?.posts ?? [])]).map((t) => [t.id, t]),
  );

  const user = users.get(rootTweet.author_id);
  if (!user) throw new XApiError(`Author ${rootTweet.author_id} not included in the response`, 404);

  // A thread is the chain of self-replies that starts at the root
  const candidates = new Map<string, RawTweet>();
  for (const tweet of pages.flatMap((page) => page.data ?? [])) {
    if (tweet.author_id === rootTweet.author_id) candidates.set(tweet.id, tweet);
  }
  const ordered = [...candidates.values()].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));

  const warnings: string[] = [];
  const chain: RawTweet[] = [rootTweet];
  for (const tweet of ordered) {
    if (tweet.id === rootTweet.id) continue;
    const parent = references(tweet).find((ref) => ref.type === 'replied_to')?.id;
    if (parent === chain[chain.length - 1]!.id) {
      chain.push(tweet);
    } else if (parent && chain.some((kept) => kept.id === parent)) {
      warnings.push(`Tweet ${tweet.id} branches off the thread (replies to ${parent}); skipped`);
    }
  }

  const toMedia = (keys: string[] = []): Media[] =>
    keys.flatMap((key): Media[] => {
      const item = media.get(key);
      if (!item) return [];
      if (item.type === 'photo') return item.url ? [{ kind: 'photo', url: item.url, posterUrl: null, alt: item.alt_text ?? null }] : [];
      const best = (item.variants ?? [])
        .filter((variant) => variant.content_type === 'video/mp4')
        .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0))[0];
      if (!best) return [];
      return [{
        kind: item.type === 'animated_gif' ? 'gif' : 'video',
        url: best.url,
        posterUrl: item.preview_image_url ?? null,
        alt: item.alt_text ?? null,
      }];
    });

  const toTweet = (raw: RawTweet): Tweet => {
    const quotedId = references(raw).find((ref) => ref.type === 'quoted')?.id ?? null;
    const quoted = quotedId ? included.get(quotedId) : undefined;
    const metrics = raw.public_metrics ?? {};

    let quote: Quote | null = null;
    if (quotedId && quoted) {
      const quotedAuthor = users.get(quoted.author_id);
      quote = {
        quotedId,
        authorHandle: quotedAuthor?.username ?? null,
        authorName: quotedAuthor?.name ?? null,
        text: expandText(quoted, null),
        media: toMedia(quoted.attachments?.media_keys),
      };
    } else if (quotedId) {
      warnings.push(`Tweet ${raw.id} quotes ${quotedId}, which is not available`);
    }

    return {
      id: raw.id,
      text: expandText(raw, quotedId),
      createdAt: new Date(raw.created_at).toISOString(),
      stats: {
        likes: metrics.like_count ?? 0,
        retweets: metrics.retweet_count ?? 0,
        replies: metrics.reply_count ?? 0,
        quotes: metrics.quote_count ?? 0,
        bookmarks: metrics.bookmark_count ?? 0,
        views: metrics.impression_count ?? 0,
      },
      media: toMedia(raw.attachments?.media_keys),
      links: toLinks(raw, quotedId),
      quote,
    };
  };

  return {
    author: { handle: user.username, name: user.name, xUserId: user.id, avatarUrl: user.profile_image_url ?? null },
    tweets: chain.map(toTweet),
    warnings,
  };
}

/** A t.co link that only points to attached media or to the quoted tweet. */
function isAttachmentUrl(entity: RawUrlEntity, quotedId: string | null): boolean {
  const target = entity.expanded_url ?? '';
  return (
    !!entity.media_key ||
    /\/status\/\d+\/(photo|video)\/\d+/.test(target) ||
    (quotedId !== null && new RegExp(`/status/${quotedId}(?:\\D|$)`).test(target))
  );
}

/** Full text (long posts come in note_tweet) with t.co links expanded and attachment links removed. */
function expandText(tweet: RawTweet, quotedId: string | null): string {
  const longPost = note(tweet);
  const text = longPost?.text ?? tweet.text;
  const entities = [...(longPost?.entities?.urls ?? []), ...(tweet.entities?.urls ?? [])];
  const expanded = entities.reduce((result, entity) => {
    const replacement = isAttachmentUrl(entity, quotedId) ? '' : (entity.unwound_url ?? entity.expanded_url ?? entity.url);
    return result.split(entity.url).join(replacement);
  }, text);
  return expanded.trim();
}

function toLinks(tweet: RawTweet, quotedId: string | null): Link[] {
  const links = new Map<string, Link>();
  for (const entity of [...(tweet.entities?.urls ?? []), ...(note(tweet)?.entities?.urls ?? [])]) {
    if (isAttachmentUrl(entity, quotedId)) continue;
    const url = entity.unwound_url ?? entity.expanded_url;
    if (!url || /^https?:\/\/(x|twitter)\.com\//.test(url)) continue;
    if (links.has(url)) continue;
    links.set(url, {
      url,
      domain: new URL(url).hostname.replace(/^www\./, ''),
      title: entity.title ?? null,
      description: entity.description ?? null,
      imageUrl: entity.images?.[0]?.url ?? null,
    });
  }
  return [...links.values()];
}
