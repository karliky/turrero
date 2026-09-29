import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { mostCited } from "@/lib/concepts";
import { listCitations, listConceptMap } from "@/lib/queries";
import { IdeaMatrix } from "./IdeaMatrix";
import { pageMetadata } from "@/lib/seo";

const description =
  "Qué conceptos aparecen en las turras de Javier G. Recuenco, cuándo aparecen y en qué turras se apoyan las demás.";

// The share card is the colocated opengraph-image.tsx
export const metadata: Metadata = pageMetadata({ title: "Mapa de ideas", description, path: "/mapa-de-ideas", ownImage: true });

/** Concepts in fewer turras are noise in the matrix; they stay in the glossary. */
const MIN_THREADS = 3;
const MOST_CITED = 15;

const heading = "font-serif text-2xl font-bold text-whiskey-950 sm:text-3xl";

export default function MapaDeIdeas() {
  const { threads, concepts } = listConceptMap();
  const shown = concepts.filter((concept) => concept.threads.length >= MIN_THREADS);
  const allYears = threads.map((thread) => Number(thread.publishedAt.slice(0, 4)));
  const years = Array.from({ length: Math.max(...allYears) - Math.min(...allYears) + 1 }, (_, i) => String(Math.min(...allYears) + i));

  // Only what the client needs: the turras of the matrix, with the day and no time
  const used = new Set(shown.flatMap((concept) => concept.threads));
  const inMatrix = threads
    .filter((thread) => used.has(thread.id))
    .map((thread) => ({ ...thread, publishedAt: thread.publishedAt.slice(0, 10) }));

  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const cited = mostCited(listCitations()).slice(0, MOST_CITED);
  const topCount = cited[0]?.citedBy.length ?? 1;

  return (
    <main className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl font-bold text-whiskey-950 sm:text-5xl">Mapa de ideas</h1>
        <p className="mt-4 text-lg leading-relaxed text-whiskey-900">
          Qué conceptos aparecen en las turras y cuándo, y en qué turras se apoyan las demás. Los conceptos son los del{" "}
          <Link href="/glosario" className="underline decoration-whiskey-300 underline-offset-4 hover:text-brand hover:decoration-brand">
            glosario
          </Link>
          .
        </p>
      </header>

      <section aria-labelledby="evolucion" className="mt-12">
        <h2 id="evolucion" className={heading}>
          Cómo evolucionan las ideas
        </h2>
        <p className="mb-5 mt-2 max-w-3xl leading-relaxed text-whiskey-900">
          Cada fila es un concepto y cada columna un año. El número es cuántas turras de ese año lo mencionan. Salen los{" "}
          {shown.length} conceptos que aparecen en {MIN_THREADS} turras o más.
        </p>
        <Suspense fallback={<p className="text-whiskey-800">Cargando el mapa…</p>}>
          <IdeaMatrix concepts={shown} threads={inMatrix} years={years} />
        </Suspense>
      </section>

      <section aria-labelledby="cimientos" className="mt-16 max-w-4xl">
        <h2 id="cimientos" className={heading}>
          En qué turras se apoyan las demás
        </h2>
        <p className="mt-2 leading-relaxed text-whiskey-900">
          Muchas turras citan otras anteriores para no repetir lo ya explicado. Estas son las más citadas: si varias turras remiten a
          una, conviene haberla leído.
        </p>
        <ol className="mt-6 space-y-5">
          {cited.map(({ id, citedBy }) => {
            const thread = byId.get(id);
            if (!thread) return null;
            const citing = citedBy.flatMap((from) => byId.get(from) ?? []).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
            return (
              <li key={id}>
                <div className="flex items-baseline justify-between gap-4">
                  <Link href={`/turra/${id}`} className="font-medium leading-snug text-whiskey-950 hover:text-brand">
                    {thread.title}
                  </Link>
                  <span className="shrink-0 text-sm tabular-nums text-whiskey-700">{thread.publishedAt.slice(0, 4)}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-whiskey-100">
                    <div className="h-2 rounded-full bg-whiskey-400" style={{ width: `${(citedBy.length / topCount) * 100}%` }} />
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-whiskey-800">
                    La citan {citedBy.length} turras
                  </span>
                </div>
                <details className="mt-1 text-sm">
                  <summary className="cursor-pointer text-whiskey-800 hover:text-brand">Cuáles</summary>
                  <ul className="mt-2 space-y-1 border-l-2 border-whiskey-200 pl-4">
                    {citing.map((from) => (
                      <li key={from.id}>
                        <Link href={`/turra/${from.id}`} className="text-whiskey-900 hover:text-brand">
                          {from.title}
                        </Link>{" "}
                        <span className="tabular-nums text-whiskey-700">({from.publishedAt.slice(0, 4)})</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
