// Finding turras that are not in the database yet: an author's threads published on a given weekday.
import type { Db } from './db';
import { getThreadIdOfTweet } from './queries';
import type { XClient } from './x';

/** Shortest turra ever archived; shorter threads are not turras. */
export const MIN_THREAD_TWEETS = 8;
export const SATURDAY = 6;
const TIME_ZONE = 'Europe/Madrid';
const DAY_MS = 24 * 3600 * 1000;

export interface Candidate {
  id: string;
  publishedAt: string;
  firstLine: string;
  tweets: number | null;
  /** null when the candidate is a turra to import; otherwise why it was discarded. */
  rejection: string | null;
}

export interface DiscoverOptions {
  handle: string;
  /** Only posts after this instant; defaults to the author's latest turra in the database. */
  since?: Date;
  until?: Date;
  weekday?: number; // 0 = Sunday … 6 = Saturday, in Madrid time
}

/** Offset of Madrid from UTC (in ms) around the given instant. */
function madridOffsetMs(instant: number): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(new Date(instant))
    .find((part) => part.type === 'timeZoneName')!.value; // "GMT+02:00"
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

/** Madrid calendar days (YYYY-MM-DD) with the given weekday, strictly after `since` and up to `until`. */
export function weekdaysBetween(since: Date, until: Date, weekday: number): string[] {
  const days: string[] = [];
  const toMadridDay = (instant: number) => new Date(instant + madridOffsetMs(instant)).toISOString().slice(0, 10);
  let day = Date.parse(`${toMadridDay(since.getTime())}T00:00:00Z`) + DAY_MS;
  const last = Date.parse(`${toMadridDay(until.getTime())}T00:00:00Z`);
  for (; day <= last; day += DAY_MS) {
    if (new Date(day).getUTCDay() === weekday) days.push(new Date(day).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Free pre-filter before paying for the whole thread: every archived turra announces itself
 * ("En el hilo turras de hoy…", "mini hilo turras", "Otra temporada de hilos turras"…).
 */
export function looksLikeTurra(text: string): boolean {
  return /hilo|turra|🧵/i.test(text);
}

/** UTC range covering a Madrid calendar day (00:00 to 24:00 local time). */
export function madridDayRange(day: string): { startTime: string; endTime: string } {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  // DST changes happen at 02:00-03:00, so the offset at noon is the one of the whole day's midnight
  const start = utcMidnight - madridOffsetMs(utcMidnight + DAY_MS / 2);
  return { startTime: new Date(start).toISOString(), endTime: new Date(start + DAY_MS).toISOString() };
}

function latestTurra(db: Db, handle: string): Date | null {
  const row = db.prepare('SELECT max(published_at) AS last FROM threads WHERE author_handle = ?').get(handle) as {
    last: string | null;
  };
  return row.last ? new Date(row.last) : null;
}

/** Searches the author's original posts day by day and checks which ones are new turras. */
export async function findTurras(db: Db, x: XClient, options: DiscoverOptions): Promise<Candidate[]> {
  const since = options.since ?? latestTurra(db, options.handle);
  if (!since) throw new Error(`No turras of @${options.handle} in the database; pass --since`);
  // X rejects end times closer than 10 seconds to the request
  const until = new Date(Math.min((options.until ?? new Date()).getTime(), Date.now() - 30_000));

  const candidates: Candidate[] = [];
  const seen = new Set<string>(); // search pages can repeat posts
  for (const day of weekdaysBetween(since, until, options.weekday ?? SATURDAY)) {
    const range = madridDayRange(day);
    if (Date.parse(range.endTime) > until.getTime()) range.endTime = until.toISOString();

    const posts = await x.searchPosts(`from:${options.handle} -is:reply -is:retweet`, range);
    for (const post of posts.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      const candidate: Candidate = {
        id: post.id,
        publishedAt: post.createdAt,
        firstLine: post.text.split('\n')[0]!.slice(0, 100),
        tweets: null,
        rejection: null,
      };
      candidates.push(candidate);

      if (post.conversationId !== post.id) {
        candidate.rejection = 'not the start of a conversation';
      } else if (!looksLikeTurra(post.text)) {
        candidate.rejection = 'does not mention "hilo" or "turra"';
      } else if (getThreadIdOfTweet(post.id, db)) {
        candidate.rejection = 'already in the database';
      } else {
        try {
          const thread = await x.fetchThread(post.id);
          candidate.tweets = thread.tweets.length;
          if (thread.author.handle.toLowerCase() !== options.handle.toLowerCase()) {
            candidate.rejection = `written by @${thread.author.handle}`;
          } else if (thread.tweets.length < MIN_THREAD_TWEETS) {
            candidate.rejection = `only ${thread.tweets.length} tweet(s)`;
          }
        } catch (error) {
          candidate.rejection = `could not fetch the thread: ${(error as Error).message}`;
        }
      }
    }
  }
  return candidates;
}
