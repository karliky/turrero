import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "../../components/JsonLd";
import { Entry } from "../GlossaryEntry";
import { formatMonthYear } from "@/lib/archive";
import { listConceptMap, listGlossary } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbLd, definedTermLd } from "@/lib/structured-data";

interface Params {
  params: Promise<{ slug: string }>;
}

/** How many of the turras that mention the term are listed below its definition. */
const MENTIONS = 12;

export const dynamicParams = false;

export function generateStaticParams() {
  return listGlossary().map((term) => ({ slug: term.slug }));
}

const termOf = (slug: string) => listGlossary().find((term) => term.slug === slug) ?? null;

// The concept map runs the term linker over every turra: once per build, not once per term page
let conceptMap: ReturnType<typeof listConceptMap> | null = null;
const getConceptMap = () => (conceptMap ??= listConceptMap());

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const term = termOf((await params).slug);
  if (!term) return {};
  // People search «qué es…» and «… significado»: the title answers both
  return pageMetadata({ title: `${term.term}: qué es y qué significa`, description: term.short, path: `/glosario/${term.slug}` });
}

export default async function GlossaryTermPage({ params }: Params) {
  const term = termOf((await params).slug);
  if (!term) notFound();

  const glossary = listGlossary();
  const byslug = new Map(glossary.map((entry) => [entry.slug, entry]));
  const { threads, concepts } = getConceptMap();
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const sources = new Set(term.sources.map((source) => source.threadId));
  // Turras that use the term, newest first, without the ones already listed as its sources
  const mentions = (concepts.find((concept) => concept.slug === term.slug)?.threads ?? [])
    .filter((id) => !sources.has(id))
    .flatMap((id) => byId.get(id) ?? []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={[definedTermLd(term), breadcrumbLd([["Glosario", "/glosario"], [term.term, `/glosario/${term.slug}`]])]} />
      <nav aria-label="Migas" className="mb-6 text-sm text-whiskey-800">
        <Link href="/glosario" className="underline decoration-whiskey-300 underline-offset-4 hover:text-brand">
          Glosario CPS
        </Link>
      </nav>

      <Entry entry={term} byslug={byslug} standalone />

      {mentions.length > 0 && (
        <section aria-labelledby="menciones" className="mt-12 border-t border-whiskey-200 pt-6">
          <h2 id="menciones" className="font-serif text-xl font-bold text-whiskey-950">
            También aparece en {mentions.length} {mentions.length === 1 ? "turra" : "turras"}
          </h2>
          <ul className="mt-4 space-y-2">
            {mentions.slice(0, MENTIONS).map((thread) => (
              <li key={thread.id} className="flex gap-3 leading-snug">
                <span className="w-20 shrink-0 text-sm tabular-nums text-whiskey-700">{formatMonthYear(thread.publishedAt)}</span>
                <Link href={`/turra/${thread.id}`} className="text-whiskey-950 hover:text-brand">
                  {thread.title}
                </Link>
              </li>
            ))}
          </ul>
          {mentions.length > MENTIONS && (
            <p className="mt-4 text-sm">
              <Link href={`/mapa-de-ideas?concepto=${term.slug}`} className="underline decoration-whiskey-300 underline-offset-4 hover:text-brand">
                Ver las {mentions.length} en el mapa de ideas
              </Link>
            </p>
          )}
        </section>
      )}
    </main>
  );
}
