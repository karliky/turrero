import { describe, expect, test } from 'vitest';
import {
  countByYear,
  filterThreads,
  filtersToQuery,
  formatMonthYear,
  groupByYear,
  parseFilters,
  pickUnique,
  yearOf,
  type ArchiveFilters,
} from '../lib/archive';
import type { ArchiveThread } from '../lib/types';

function thread(id: string, publishedAt: string, extra: Partial<ArchiveThread> = {}): ArchiveThread {
  return {
    id,
    title: `Turra ${id}`,
    publishedAt,
    authorHandle: 'Recuenco',
    authorName: 'Javier G. Recuenco',
    stats: { likes: 0, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 },
    categories: [],
    ...extra,
  };
}

const stats = (likes: number) => ({ likes, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 });

const threads = [
  thread('4', '2025-06-07T08:00:00.000Z', { categories: ['estrategia'], stats: stats(5) }),
  thread('3', '2025-01-04T08:00:00.000Z', { categories: ['gaming'], stats: stats(50) }),
  thread('2', '2024-03-02T08:00:00.000Z', { categories: ['estrategia', 'gaming'], stats: stats(20), authorHandle: 'otra' }),
  // 23:30 UTC on New Year's Eve is already 2024 in Madrid
  thread('1', '2023-12-31T23:30:00.000Z', { categories: ['estrategia'], stats: stats(20) }),
];

const none: ArchiveFilters = { year: null, category: null, author: null, order: 'recientes' };
const ids = (list: { id: string }[]) => list.map((t) => t.id);

describe('filters', () => {
  test('parse the URL, with the default author unless "todos" is chosen', () => {
    expect(parseFilters(new URLSearchParams(''), 'Recuenco')).toEqual({ ...none, author: 'Recuenco' });
    expect(parseFilters(new URLSearchParams('anio=2025&categoria=estrategia&autor=todos&orden=antiguas'), 'Recuenco')).toEqual({
      year: '2025',
      category: 'estrategia',
      author: null,
      order: 'antiguas',
    });
    expect(parseFilters(new URLSearchParams('orden=inventado')).order).toBe('recientes');
  });

  test('serialize without defaults and round-trip', () => {
    expect(filtersToQuery({ ...none, author: 'Recuenco' }, 'Recuenco')).toBe('');
    expect(filtersToQuery(none, 'Recuenco')).toBe('?autor=todos');
    const filters: ArchiveFilters = { year: '2024', category: 'gaming', author: 'otra', order: 'interaccion' };
    expect(parseFilters(new URLSearchParams(filtersToQuery(filters, 'Recuenco')), 'Recuenco')).toEqual(filters);
  });

  test('filter by year (Madrid time), category and author', () => {
    expect(ids(filterThreads(threads, { ...none, year: '2024' }))).toEqual(['2', '1']);
    expect(ids(filterThreads(threads, { ...none, category: 'gaming' }))).toEqual(['3', '2']);
    expect(ids(filterThreads(threads, { ...none, author: 'Recuenco', category: 'estrategia' }))).toEqual(['4', '1']);
  });

  test('order by date either way or by engagement', () => {
    expect(ids(filterThreads(threads, { ...none, order: 'antiguas' }))).toEqual(['1', '2', '3', '4']);
    // Ties in engagement go to the newest
    expect(ids(filterThreads(threads, { ...none, order: 'interaccion' }))).toEqual(['3', '2', '1', '4']);
  });

  test('count years with the other filters applied', () => {
    expect(countByYear(threads, { ...none, year: '2025', category: 'estrategia' })).toEqual([
      ['2025', 1],
      ['2024', 2],
    ]);
  });
});

test('groups by year keeping the order', () => {
  expect(groupByYear(threads).map(({ year, threads: list }) => [year, ids(list)])).toEqual([
    ['2025', ['4', '3']],
    ['2024', ['2', '1']],
  ]);
});

test('dates use Madrid time and Spanish month names', () => {
  expect(yearOf('2023-12-31T23:30:00.000Z')).toBe('2024');
  expect(formatMonthYear('2026-02-07T08:00:00.000Z')).toMatch(/^feb\.? 2026$/);
});

test('pickUnique shows each turra once, earlier lists first', () => {
  const [top, newest, category] = pickUnique([
    { threads: threads.slice(0, 2), limit: 2 },
    { threads, limit: 2 },
    { threads, limit: 5 },
  ]);
  expect(ids(top!)).toEqual(['4', '3']);
  expect(ids(newest!)).toEqual(['2', '1']);
  expect(category).toEqual([]);
});

test('pickUnique can top up a short list with turras already shown', () => {
  const [first, second] = pickUnique([
    { threads: threads.slice(0, 3), limit: 3 },
    { threads, limit: 3, fill: true },
  ]);
  expect(ids(first!)).toEqual(['4', '3', '2']);
  // Only '1' is new; the rest is filled in the list's order with repeated turras
  expect(ids(second!)).toEqual(['1', '4', '3']);
});
