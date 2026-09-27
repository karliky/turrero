// Client for the official X API v2 (https://docs.x.com). App-only auth with a bearer token.
// fetchThread() downloads a thread; normalizeThread() turns the raw responses into the domain model.
import type { ResponseCache } from './cache';
import type { Author, Link, Media, Quote, Tweet } from './types';

const API_URL = 'https://api.x.com/2';
const MAX_RATE_LIMIT_RETRIES = 3; // also used for transient 5xx errors
const SEARCH_PATH = '/tweets/search/all';
const DAY_MS = 24 * 3600_000;

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

/** Minimal view of a post returned by searchPosts. */
export interface PostSummary {
  id: string;
  createdAt: string;
  text: string;
  conversationId: string;
}

export interface XClient {
  fetchThread(tweetId: string): Promise<XThread>;
  /** Full-archive search, e.g. `from:Recuenco -is:reply` between two instants. */
  searchPosts(query: string, range: { startTime: string; endTime: string }): Promise<PostSummary[]>;
}

export interface XClientOptions {
  bearerToken: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Successful responses are stored here and reused: X bills every post read. */
  cache?: ResponseCache;
}

export function createXClient({ bearerToken, fetch: fetchFn = fetch, sleep = defaultSleep, cache }: XClientOptions): XClient {
  let lastSearchAt = 0;

  async function get<T>(path: string, params: Record<string, string>): Promise<RawResponse<T>> {
    const url = `${API_URL}${path}?${new URLSearchParams(params)}`;
    const cached = cache?.read(url);
    if (cached !== undefined) return cached as RawResponse<T>;

    if (path === SEARCH_PATH) {
      // Full-archive search allows 1 request per second
      const wait = lastSearchAt + 1000 - Date.now();
      if (wait > 0) await sleep(wait);
      lastSearchAt = Date.now();
    }

    for (let attempt = 0; ; attempt++) {
      const response = await fetchFn(url, { headers: { Authorization: `Bearer ${bearerToken}` } });
      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const reset = Number(response.headers.get('x-rate-limit-reset'));
        const waitMs = Number.isFinite(reset) && reset > 0 ? Math.max(reset * 1000 - Date.now(), 1000) : 60_000;
        await sleep(Math.min(waitMs, 15 * 60_000));
        continue;
      }
      if (response.status >= 500 && attempt < MAX_RATE_LIMIT_RETRIES) {
        await sleep(5_000 * 3 ** attempt); // transient X outage: 5s, 15s, 45s
        continue;
      }
      const body = (await response.json().catch(() => ({}))) as RawResponse<T> & RawProblem;
      if (!response.ok) {
        throw problemToError(body.errors?.[0] ?? body, response.status);
      }
      cache?.write(url, body);
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

      // Full-archive search returns the whole conversation regardless of its age. Only the author's
      // replies to itself are requested (to:): replies to or from other people are never stored, so never paid...
      let pages = await searchAll({ ...PARAMS, query: `conversation_id:${root.data!.id} from:${username} to:${username}`, max_results: '500' });
      const warnings: string[] = [];
      if (!pages.some((page) => page.data?.some((tweet) => tweet.id !== root.data!.id))) {
        // ...except for posts the conversation_id operator does not find (seen for months-old threads):
        // rebuild it from the author's posts of that day, a request shared by every thread of the same day
        const dayStart = Date.parse(`${root.data!.created_at.slice(0, 10)}T00:00:00Z`);
        const end = Math.min(Math.max(dayStart + DAY_MS, Date.parse(root.data!.created_at) + 6 * 3600_000), Date.now() - 30_000);
        pages = await searchAll({
          ...PARAMS,
          query: `from:${username} to:${username}`,
          start_time: new Date(dayStart).toISOString(),
          end_time: new Date(end).toISOString(),
          max_results: '500',
        });
        warnings.push('Thread rebuilt from the author posts of that day (conversation search returned nothing)');
      }
      const thread = normalizeThread(root, pages);
      return { ...thread, warnings: [...warnings, ...thread.warnings] };
    },

    async searchPosts(query, { startTime, endTime }) {
      const pages = await searchAll({
        'tweet.fields': 'created_at,conversation_id,note_tweet',
        query,
        start_time: startTime,
        end_time: endTime,
        max_results: '100',
      });
      return pages.flatMap((page) => page.data ?? []).map((tweet) => ({
        id: tweet.id,
        createdAt: new Date(tweet.created_at).toISOString(),
        text: note(tweet)?.text ?? tweet.text,
        conversationId: tweet.conversation_id,
      }));
    },
  };

  async function searchAll(params: Record<string, string>): Promise<RawResponse<RawTweet[]>[]> {
    const pages: RawResponse<RawTweet[]>[] = [];
    let nextToken: string | undefined;
    do {
      const page = await get<RawTweet[]>(SEARCH_PATH, { ...params, ...(nextToken ? { pagination_token: nextToken } : {}) });
      pages.push(page);
      nextToken = page.meta?.next_token;
    } while (nextToken);
    return pages;
  }
}

/** Exchanges the app's API key and secret for an app-only bearer token (OAuth 2.0 client credentials). */
export async function fetchBearerToken(apiKey: string, apiSecret: string, fetchFn: typeof fetch = fetch): Promise<string> {
  const credentials = Buffer.from(`${encodeURIComponent(apiKey)}:${encodeURIComponent(apiSecret)}`).toString('base64');
  const response = await fetchFn('https://api.x.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: 'grant_type=client_credentials',
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string } & RawResponse<unknown> & RawProblem;
  if (!response.ok || !body.access_token) {
    throw problemToError(body.errors?.[0] ?? { detail: 'Could not obtain an X API bearer token' }, response.status);
  }
  return body.access_token;
}

/** X client configured from X_API_BEARER_TOKEN, or from X_API_KEY + X_API_KEY_SECRET. */
export async function createXClientFromEnv(cache?: ResponseCache, env: Record<string, string | undefined> = process.env): Promise<XClient> {
  const options = cache ? { cache } : {};
  if (env.X_API_BEARER_TOKEN) return createXClient({ bearerToken: env.X_API_BEARER_TOKEN, ...options });
  if (env.X_API_KEY && env.X_API_KEY_SECRET) {
    return createXClient({ bearerToken: await fetchBearerToken(env.X_API_KEY, env.X_API_KEY_SECRET), ...options });
  }
  throw new Error('Missing X API credentials: set X_API_BEARER_TOKEN, or X_API_KEY and X_API_KEY_SECRET (see .env.example)');
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
