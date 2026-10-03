"use client";

import Link from "next/link";
import { cooccurring } from "@/lib/concepts";
import type { ConceptRow, MapThread } from "@/lib/types";

interface ConceptDetailProps {
  concept: ConceptRow;
  concepts: ConceptRow[];
  threads: MapThread[];
  years: string[];
  onSelect: (slug: string) => void;
}

const link = "underline decoration-whiskey-300 underline-offset-4 hover:text-brand hover:decoration-brand";

/** One concept: its definition, when it appears, the ideas it travels with and its turras. */
export function ConceptDetail({ concept, concepts, threads, years: allYears, onSelect }: ConceptDetailProps) {
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const own = concept.threads.flatMap((id) => byId.get(id) ?? []);
  const years = [...new Set(own.map((thread) => thread.publishedAt.slice(0, 4)))];
  const first = years.at(-1);
  const last = years[0];
  const names = new Map(concepts.map((c) => [c.slug, c.term]));
  const neighbours = cooccurring(concept.slug, concepts, 6);

  // Time strip: the whole archive sets the scale, so strips of different concepts compare
  const start = Date.parse(`${allYears[0]}-01-01`);
  const span = Date.parse(`${allYears.at(-1)}-12-31`) - start || 1;
  // Drawn at the panel's real width (22rem), so dots and years keep their size
  const x = (date: string) => 6 + ((Date.parse(date) - start) / span) * 308;
  const ticks = allYears;

  return (
    <section aria-labelledby="concept-title" className="rounded-xl border border-whiskey-200 border-t-[3px] border-t-brand bg-surface p-5 shadow-sm">
      <h3 id="concept-title" className="font-serif text-2xl font-bold text-whiskey-950">
        {concept.term}
      </h3>
      <p className="mt-2 leading-relaxed text-whiskey-900">{concept.short}</p>
      <p className="mt-2 text-sm text-whiskey-800">
        En {own.length} {own.length === 1 ? "turra" : "turras"}
        {first && last && first !== last ? `, de ${first} a ${last}` : first ? `, en ${first}` : ""}.{" "}
        <Link href={`/glosario/${concept.slug}`} className={link}>
          Ver en el glosario
        </Link>
      </p>

      <svg viewBox="0 0 320 36" className="mt-4 w-full" role="img" aria-label={`Turras con ${concept.term} a lo largo del tiempo`}>
        <line x1="6" x2="314" y1="12" y2="12" className="stroke-whiskey-200" strokeWidth="1.5" />
        {ticks.map((year) => (
          <text key={year} x={x(`${year}-07-01`)} y="32" className="fill-whiskey-700 text-[10px]" textAnchor="middle">
            {`'${year.slice(2)}`}
          </text>
        ))}
        {own.map((thread) => (
          <a key={thread.id} href={`/turra/${thread.id}`}>
            <title>{thread.title}</title>
            <circle cx={x(thread.publishedAt)} cy="12" r="4.5" className="fill-whiskey-500/70 stroke-white hover:fill-brand" strokeWidth="1" />
          </a>
        ))}
      </svg>

      {neighbours.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-whiskey-800">Aparece junto a</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {neighbours.map((neighbour) => (
              <li key={neighbour.slug}>
                <button
                  type="button"
                  onClick={() => onSelect(neighbour.slug)}
                  className="rounded-full bg-whiskey-100 px-3 py-1 text-sm text-whiskey-900 transition-colors hover:bg-whiskey-200"
                >
                  {names.get(neighbour.slug)} <span className="tabular-nums text-whiskey-700">{neighbour.shared}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="mt-5 text-sm font-semibold text-whiskey-800">Las turras</h4>
      <div className="mt-2 max-h-80 space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-34rem)] lg:min-h-40">
        {years.map((year) => (
          <div key={year}>
            <p className="text-xs font-semibold tabular-nums text-whiskey-700">{year}</p>
            <ul className="mt-1 space-y-1">
              {own
                .filter((thread) => thread.publishedAt.startsWith(year))
                .map((thread) => (
                  <li key={thread.id} className="text-sm leading-snug">
                    <Link href={`/turra/${thread.id}`} className="text-whiskey-950 hover:text-brand">
                      {thread.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
