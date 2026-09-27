const TWITTER_EPOCH_MS = 1288834974657n;

/** Creation time encoded in an X snowflake id, as ISO-8601 UTC. */
export function snowflakeTime(id: string): string {
  const ms = (BigInt(id) >> 22n) + TWITTER_EPOCH_MS;
  return new Date(Number(ms)).toISOString();
}

/** Parses counters like "", "12", "12,345", "47.1K" or "3M". Returns null when unparsable. */
export function parseCount(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;
  const text = value.trim().replace(/,/g, '');
  if (text === '') return 0;
  const match = /^(\d+(?:\.\d+)?)([KM]?)$/i.exec(text);
  if (!match) return null;
  const multiplier = { '': 1, K: 1_000, M: 1_000_000 }[match[2]!.toUpperCase() as '' | 'K' | 'M'];
  return Math.round(Number(match[1]) * multiplier);
}

/** ASCII URL slug: "Resolución de problemas" -> "resolucion-de-problemas". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Accepts a tweet id or an x.com / twitter.com status URL. */
export function tweetIdFromInput(input: string): string {
  const value = input.trim();
  if (/^\d+$/.test(value)) return value;
  const match = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i.exec(value);
  if (!match) throw new Error(`Not a tweet id or X status URL: ${input}`);
  return match[1]!;
}
