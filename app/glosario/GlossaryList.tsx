"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GLOSSARY_GROUPS, type GlossaryGroup, type GlossaryTerm } from "@/lib/types";

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const letterOf = (term: string) => fold(term).charAt(0).toUpperCase();

/** Cynefin's five domains laid out as in Snowden's diagram, with "confuso" in the middle. */
// Each quadrant keeps clear of the centre, where the "confuso" label sits
const CYNEFIN_POSITION: Record<string, string> = {
  complejo: "col-start-1 row-start-1 pr-8 pb-7",
  complicado: "col-start-2 row-start-1 pl-8 pb-7",
  caotico: "col-start-1 row-start-2 pr-8 pt-7",
  claro: "col-start-2 row-start-2 pl-8 pt-7",
};

function Cynefin({ domains }: { domains: { name: string; text: string }[] }) {
  const confused = domains.find((d) => fold(d.name).startsWith("confus"));
  return (
    <figure className="my-5" aria-label="Los cinco dominios de Cynefin">
      <div className="relative grid grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-lg border border-whiskey-200 bg-whiskey-200">
        {domains
          .filter((d) => d !== confused)
          .map((d) => (
            <div key={d.name} className={`bg-surface p-4 ${CYNEFIN_POSITION[fold(d.name)] ?? ""}`}>
              <p className="font-serif text-lg font-bold capitalize text-whiskey-950">{d.name}</p>
              <p className="mt-1 text-sm leading-snug text-whiskey-900">{d.text}</p>
            </div>
          ))}
        {confused && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-whiskey-300 bg-whiskey-50 px-3 py-1 font-serif text-sm font-bold capitalize text-whiskey-950 shadow-sm">
            {confused.name}
          </span>
        )}
      </div>
      {confused && (
        <figcaption className="mt-2 text-sm text-whiskey-900">
          <strong className="font-serif capitalize">{confused.name}</strong>, en el centro: {confused.text.charAt(0).toLowerCase() + confused.text.slice(1)}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Other names worth showing: aliases also include inflections used only to link the term in the turras
 * ("abrochadores liminales", "Zugzwang"), which would just repeat the headword.
 */
function otherNames(entry: GlossaryTerm): string[] {
  const stem = fold(entry.term).replace(/\s*\(.*\)$/, "").slice(0, 6);
  const shown = new Map<string, string>();
  for (const alias of entry.aliases) {
    const key = fold(alias).replace(/^[#@]/, "");
    if (key.startsWith(stem) || fold(entry.term).includes(key) || shown.has(key)) continue;
    shown.set(key, alias);
  }
  return [...shown.values()];
}

function Entry({ entry, byslug }: { entry: GlossaryTerm; byslug: Map<string, GlossaryTerm> }) {
  const related = entry.related.map((slug) => byslug.get(slug)).filter((t): t is GlossaryTerm => !!t);
  const aliases = otherNames(entry);
  return (
    <article
      id={entry.slug}
      className="scroll-mt-48 rounded-xl border border-transparent px-4 py-7 transition-colors target:border-whiskey-200 target:bg-surface sm:px-6"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-2xl font-bold text-whiskey-950">
          <a href={`#${entry.slug}`} className="hover:underline decoration-whiskey-300">
            {entry.term}
          </a>
        </h3>
        <span className="text-xs font-semibold uppercase tracking-wide text-whiskey-700">{GLOSSARY_GROUPS[entry.group]}</span>
      </header>
      {aliases.length > 0 && <p className="mt-1 text-sm text-whiskey-700">También: {aliases.join(", ")}</p>}

      <p className="mt-3 text-lg font-medium leading-snug text-whiskey-950">{entry.short}</p>
      <p className="mt-3 max-w-[68ch] leading-relaxed text-whiskey-900 whitespace-pre-line">{entry.body}</p>
      {entry.domains && <Cynefin domains={entry.domains} />}

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[7rem_1fr]">
        {entry.origin && (
          <>
            <dt className="font-semibold text-whiskey-800">Origen</dt>
            <dd className="text-whiskey-900">{entry.origin}</dd>
          </>
        )}
        {entry.sources.length > 0 && (
          <>
            <dt className="font-semibold text-whiskey-800">Léelo en</dt>
            <dd>
              <ul className="space-y-1">
                {entry.sources.map((source) => (
                  <li key={source.threadId}>
                    <Link
                      href={`/turra/${source.threadId}${source.tweetId ? `#${source.tweetId}` : ""}`}
                      className="text-whiskey-900 underline decoration-whiskey-300 underline-offset-2 hover:text-brand"
                    >
                      {source.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {related.length > 0 && (
          <>
            <dt className="font-semibold text-whiskey-800">Relacionado</dt>
            <dd className="flex flex-wrap gap-1.5">
              {related.map((term) => (
                <a
                  key={term.slug}
                  href={`#${term.slug}`}
                  className="rounded-full border border-whiskey-200 bg-whiskey-50 px-2.5 py-0.5 text-whiskey-900 hover:border-whiskey-400"
                >
                  {term.term}
                </a>
              ))}
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}

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
