import { describe, expect, test } from 'vitest';
import { conceptThreads, cooccurring, countByYear, mostCited } from '../lib/concepts';
import { openDb } from '../lib/db';
import { listCitations, listConceptMap } from '../lib/queries';

const terms = [
  { slug: 'personotecnia', names: ['personotecnia'] },
  { slug: 'factor-x', names: ['Factor X', 'factor-x'] },
  { slug: 'zeitgeist', names: ['zeitgeist'] },
];

describe('idea map', () => {
  test('a turra counts once per concept, whatever the tweet or the alias', () => {
    const found = conceptThreads(
      [
        { id: 'a', texts: ['La personotecnia y el Factor X.', 'Más personotecnia, y el factor-x otra vez.'] },
        { id: 'b', texts: ['Nada que ver.'] },
        { id: 'c', texts: ['Zeitgeist y PERSONOTECNIA.'] },
      ],
      terms,
    );
    expect(Object.fromEntries(found)).toEqual({ personotecnia: ['a', 'c'], 'factor-x': ['a'], zeitgeist: ['c'] });
  });

  test('counts per year keep every year, including empty ones', () => {
    const year = { a: '2020', b: '2022', c: '2022' } as Record<string, string>;
    expect(countByYear(['a', 'b', 'c'], (id) => year[id]!, ['2020', '2021', '2022'])).toEqual([1, 0, 2]);
  });

  test('co-occurrence ranks the concepts that share the most turras', () => {
    const concepts = [
      { slug: 'x', threads: ['1', '2', '3'] },
      { slug: 'y', threads: ['1'] },
      { slug: 'z', threads: ['2', '3', '4'] },
      { slug: 'w', threads: ['9'] },
    ];
    expect(cooccurring('x', concepts, 5)).toEqual([
      { slug: 'z', shared: 2 },
      { slug: 'y', shared: 1 },
    ]);
    expect(cooccurring('x', concepts, 1)).toHaveLength(1);
  });

  test('most cited ignores self-citations and repeated pairs', () => {
    const ranked = mostCited([
      { from: 'b', to: 'a' },
      { from: 'c', to: 'a' },
      { from: 'c', to: 'a' },
      { from: 'c', to: 'b' },
      { from: 'a', to: 'a' },
    ]);
    expect(ranked).toEqual([
      { id: 'a', citedBy: ['b', 'c'] },
      { id: 'b', citedBy: ['c'] },
    ]);
  });
});

describe('committed database', () => {
  const db = openDb(undefined, { readOnly: true });

  test('citations point to archived, older turras', () => {
    const published = new Map(listConceptMap(db).threads.map((thread) => [thread.id, thread.publishedAt]));
    const citations = listCitations(db);
    expect(citations.length).toBeGreaterThan(100);
    for (const { from, to } of citations) {
      expect(published.has(from) && published.has(to), `${from} → ${to}`).toBe(true);
      expect(published.get(to)! <= published.get(from)!, `${from} cites the newer ${to}`).toBe(true);
    }
  });

  test('concepts only list existing turras, once each', () => {
    const { threads, concepts } = listConceptMap(db);
    const ids = new Set(threads.map((thread) => thread.id));
    for (const concept of concepts) {
      expect(new Set(concept.threads).size, concept.slug).toBe(concept.threads.length);
      for (const id of concept.threads) expect(ids.has(id), `${concept.slug}: ${id}`).toBe(true);
    }
  });
});
