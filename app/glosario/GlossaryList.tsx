"use client";
import { useEffect, useState } from "react";
import { GLOSSARY_GROUPS, type GlossaryGroup, type GlossaryTerm } from "@/lib/types";
import { Entry, fold } from "./GlossaryEntry";

const letterOf = (term: string) => fold(term).charAt(0).toUpperCase();

interface GlossaryListProps {
  terms: GlossaryTerm[];
  /** Anchors of merged or renamed terms → current slug, so old links still land on the right entry. */
  redirects: Record<string, string>;
}

/** Glossary as a reference work: search, theme groups, A–Z index and one article per term. */
export function GlossaryList({ terms, redirects }: GlossaryListProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GlossaryGroup | null>(null);
  const byslug = new Map(terms.map((t) => [t.slug, t]));

  useEffect(() => {
    const target = redirects[decodeURIComponent(window.location.hash.slice(1))];
    if (target) {
      window.history.replaceState(null, "", `#${target}`);
      document.getElementById(target)?.scrollIntoView();
    }
  }, [redirects]);

  const q = fold(query.trim());
  const visible = terms.filter(
    (t) =>
      (!group || t.group === group) &&
      (!q || fold([t.term, ...t.aliases, t.short, t.body].join(" ")).includes(q)),
  );
  const letters = [...new Set(terms.map((t) => letterOf(t.term)))];
  const sections = letters
    .map((letter) => ({ letter, entries: visible.filter((t) => letterOf(t.term) === letter) }))
    .filter((s) => s.entries.length > 0);
  const active = new Set(sections.map((s) => s.letter));

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-whiskey-200 bg-whiskey-50/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-80">
            <span className="sr-only">Buscar en el glosario</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar un término o una idea..."
              className="h-11 w-full rounded-lg border border-whiskey-200 bg-surface px-3 text-sm text-whiskey-950 placeholder:text-whiskey-700 focus:border-whiskey-500 focus:outline-none focus:ring-2 focus:ring-whiskey-200"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tema">
            {(Object.entries(GLOSSARY_GROUPS) as [GlossaryGroup, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={group === key}
                onClick={() => setGroup(group === key ? null : key)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  group === key
                    ? "border-whiskey-800 bg-whiskey-800 text-whiskey-50"
                    : "border-whiskey-200 bg-surface text-whiskey-900 hover:border-whiskey-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <nav aria-label="Índice alfabético" className="mt-3 flex flex-wrap gap-1">
          {letters.map((letter) =>
            active.has(letter) ? (
              <a
                key={letter}
                href={`#letra-${letter.toLowerCase()}`}
                className="flex h-7 w-7 items-center justify-center rounded text-sm font-semibold text-whiskey-900 hover:bg-whiskey-200"
              >
                {letter}
              </a>
            ) : (
              <span key={letter} className="flex h-7 w-7 items-center justify-center text-sm text-whiskey-300" aria-hidden="true">
                {letter}
              </span>
            ),
          )}
        </nav>
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length} términos
      </p>

      {sections.length === 0 && (
        <p className="py-16 text-center text-whiskey-800">
          Ningún término coincide con «{query}». Prueba con otra palabra o quita el filtro de tema.
        </p>
      )}

      <div className="space-y-10">
        {sections.map(({ letter, entries }) => (
          <section key={letter} aria-labelledby={`letra-${letter.toLowerCase()}`} className="lg:grid lg:grid-cols-[5rem_1fr] lg:gap-6">
            <h2
              id={`letra-${letter.toLowerCase()}`}
              className="scroll-mt-48 border-b border-whiskey-200 pb-1 font-serif text-4xl font-bold text-brand lg:sticky lg:top-44 lg:self-start lg:border-none"
            >
              {letter}
            </h2>
            <div className="divide-y divide-whiskey-100">
              {entries.map((entry) => (
                <Entry key={entry.slug} entry={entry} byslug={byslug} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
