// Pure helpers for turra lists: archive filters (kept in the URL), year grouping, dates and home deduplication.
import type { ArchiveThread, ThreadSummary, TweetStats } from './types';

export const ORDERS = { recientes: 'Más recientes', antiguas: 'Más antiguas', interaccion: 'Más interacción' } as const;
export type Order = keyof typeof ORDERS;

export interface ArchiveFilters {
  year: string | null;
  category: string | null;
  /** null means every author */
  author: string | null;
  order: Order;
}

/** Value of the author parameter that selects every author. */
export const ALL_AUTHORS = 'todos';

const TIME_ZONE = 'Europe/Madrid';

/** Same metric as the Top 25: retweets + quotes + likes of the root tweet. */
export function engagement(stats: TweetStats): number {
  return stats.retweets + stats.quotes + stats.likes;
}

export function yearOf(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { year: 'numeric', timeZone: TIME_ZONE }).format(new Date(iso));
}

/** "sept 2026" */
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric', timeZone: TIME_ZONE }).format(new Date(iso));
}

/** "12 sept" */
export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: TIME_ZONE }).format(new Date(iso));
}

/** "12 sept 2026" */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE }).format(
    new Date(iso),
  );
}

export function parseFilters(params: URLSearchParams, defaultAuthor: string | null = null): ArchiveFilters {
  const author = params.get('autor');
  const order = params.get('orden');
  return {
    year: params.get('anio') || null,
    category: params.get('categoria') || null,
    author: author === ALL_AUTHORS ? null : author || defaultAuthor,
    order: order && order in ORDERS ? (order as Order) : 'recientes',
  };
}

/** Query string for the filters, leaving out defaults so the plain URL stays clean. */
export function filtersToQuery(filters: ArchiveFilters, defaultAuthor: string | null = null): string {
  const params = new URLSearchParams();
  if (filters.year) params.set('anio', filters.year);
  if (filters.category) params.set('categoria', filters.category);
  if (filters.author !== defaultAuthor) params.set('autor', filters.author ?? ALL_AUTHORS);
  if (filters.order !== 'recientes') params.set('orden', filters.order);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Applies every filter except the year, which is counted separately to show it next to each year. */
function filterExceptYear(threads: ArchiveThread[], filters: ArchiveFilters): ArchiveThread[] {
  return threads.filter(
    (thread) =>
      (!filters.category || thread.categories.includes(filters.category)) &&
      (!filters.author || thread.authorHandle === filters.author),
  );
}

export function filterThreads(threads: ArchiveThread[], filters: ArchiveFilters): ArchiveThread[] {
  const filtered = filterExceptYear(threads, filters).filter((thread) => !filters.year || yearOf(thread.publishedAt) === filters.year);
  const byDate = (a: ArchiveThread, b: ArchiveThread) => a.publishedAt.localeCompare(b.publishedAt);
  if (filters.order === 'antiguas') return filtered.sort(byDate);
  if (filters.order === 'interaccion') return filtered.sort((a, b) => engagement(b.stats) - engagement(a.stats) || byDate(b, a));
  return filtered.sort((a, b) => byDate(b, a));
}

/** Turras per year for the other active filters, newest year first. */
export function countByYear(threads: ArchiveThread[], filters: ArchiveFilters): [string, number][] {
  const counts = new Map<string, number>();
  for (const thread of filterExceptYear(threads, filters)) {
    const year = yearOf(thread.publishedAt);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => b.localeCompare(a));
}

/** Groups consecutive turras by year, keeping their order. */
export function groupByYear<T extends ThreadSummary>(threads: T[]): { year: string; threads: T[] }[] {
  const groups: { year: string; threads: T[] }[] = [];
  for (const thread of threads) {
    const year = yearOf(thread.publishedAt);
    const last = groups.at(-1);
    if (last?.year === year) last.threads.push(thread);
    else groups.push({ year, threads: [thread] });
  }
  return groups;
}

/**
 * Picks up to `limit` turras from each list, skipping any already picked by an earlier list,
 * so a turra appears at most once on the home page. With `fill`, a list that runs short is topped
 * up with turras already shown elsewhere, so every card reaches the limit when the list allows it.
 */
export function pickUnique<T extends { id: string }>(lists: { threads: T[]; limit: number; fill?: boolean }[]): T[][] {
  const seen = new Set<string>();
  return lists.map(({ threads, limit, fill = false }) => {
    const unique = threads.filter((thread) => !seen.has(thread.id)).slice(0, limit);
    for (const thread of unique) seen.add(thread.id);
    if (!fill || unique.length === limit) return unique;
    // Top up in the list's own order, keeping the unseen turras first
    const repeated = threads.filter((thread) => !unique.includes(thread)).slice(0, limit - unique.length);
    return [...unique, ...repeated];
  });
}
