import Link from "next/link";
import { GLOSSARY_GROUPS, type GlossaryTerm } from "@/lib/types";

export const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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

/** One glossary term: as an article of the full list, or as the body of its own page (/glosario/[slug]). */
export function Entry({
  entry,
  byslug,
  standalone = false,
}: {
  entry: GlossaryTerm;
  byslug: Map<string, GlossaryTerm>;
  standalone?: boolean;
}) {
  const Heading = standalone ? "h1" : "h3";
  const related = entry.related.map((slug) => byslug.get(slug)).filter((t): t is GlossaryTerm => !!t);
  const aliases = otherNames(entry);
  return (
    <article
      id={standalone ? undefined : entry.slug}
      className={
        standalone
          ? ""
          : "scroll-mt-48 rounded-xl border border-transparent px-4 py-7 transition-colors target:border-whiskey-200 target:bg-surface sm:px-6"
      }
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading className={`font-serif font-bold text-whiskey-950 ${standalone ? "text-4xl sm:text-5xl" : "text-2xl"}`}>
          {standalone ? (
            entry.term
          ) : (
            <Link href={`/glosario/${entry.slug}`} className="hover:underline decoration-whiskey-300">
              {entry.term}
            </Link>
          )}
        </Heading>
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
                <Link
                  key={term.slug}
                  href={`/glosario/${term.slug}`}
                  className="rounded-full border border-whiskey-200 bg-whiskey-50 px-2.5 py-0.5 text-whiskey-900 hover:border-whiskey-400"
                >
                  {term.term}
                </Link>
              ))}
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}
