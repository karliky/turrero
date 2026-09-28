// The idea map (/mapa-de-ideas): which concepts appear in which turras, and which turras build on others.
// Pure and shared by server and client code: no database or Node imports.

import { createLinker, type LinkableTerm } from './glossary-links';
import type { Citation } from './types';

/**
 * Turras that mention each concept, found with the same rules that link glossary terms inside the turras.
 * A turra counts once per concept however many times it names it. Threads keep their input order.
 */
export function conceptThreads(threads: { id: string; texts: string[] }[], terms: LinkableTerm[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const thread of threads) {
    // A fresh linker per turra: it reports each term once, at its first appearance
    const linker = createLinker(terms);
    for (const text of thread.texts) {
      for (const { slug } of linker.find(text)) result.set(slug, [...(result.get(slug) ?? []), thread.id]);
    }
  }
  return result;
}

/** Number of turras per year, for the years given (missing years count 0). */
export function countByYear(threadIds: string[], yearOf: (id: string) => string, years: string[]): number[] {
  const counts = new Map<string, number>();
  for (const id of threadIds) counts.set(yearOf(id), (counts.get(yearOf(id)) ?? 0) + 1);
  return years.map((year) => counts.get(year) ?? 0);
}

/** Concepts that share the most turras with `slug`, most shared first; ties by name order of the input. */
export function cooccurring(
  slug: string,
  concepts: { slug: string; threads: string[] }[],
  limit: number,
): { slug: string; shared: number }[] {
  const own = new Set(concepts.find((concept) => concept.slug === slug)?.threads ?? []);
  return concepts
    .filter((concept) => concept.slug !== slug)
    .map((concept) => ({ slug: concept.slug, shared: concept.threads.filter((id) => own.has(id)).length }))
    .filter((concept) => concept.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit);
}

/** For each cited turra, the turras that cite it; most cited first. */
export function mostCited(citations: Citation[]): { id: string; citedBy: string[] }[] {
  const byTarget = new Map<string, Set<string>>();
  for (const { from, to } of citations) {
    if (from === to) continue;
    byTarget.set(to, (byTarget.get(to) ?? new Set()).add(from));
  }
  return [...byTarget]
    .map(([id, citedBy]) => ({ id, citedBy: [...citedBy] }))
    .sort((a, b) => b.citedBy.length - a.citedBy.length);
}
