import type { Metadata } from "next";
import Link from "next/link";
import { attractors, guide, pillars } from "./guia";
import { PillarsDiagram } from "./PillarsDiagram";
import { getSiteStats, getThread, listGlossary } from "@/lib/queries";
import { SITE } from "@/lib/site";
import { readingMinutes } from "@/lib/text";
import type { Thread } from "@/lib/types";

const description =
  "Por dónde empezar a leer las turras de Javier G. Recuenco: ocho turras en orden, las series que se leen seguidas y las ideas con nombre propio.";

export const metadata: Metadata = {
  title: `Por dónde empezar a leer las turras | ${SITE.name}`,
  description,
  openGraph: { title: `Por dónde empezar a leer las turras - ${SITE.name}`, description, images: ["/opengraph-image"] },
};

const minutesOf = (thread: Thread) => readingMinutes(thread.tweets.map((tweet) => tweet.text));
const yearOf = (thread: Thread) => thread.publishedAt.slice(0, 4);
const link = "underline decoration-whiskey-300 underline-offset-4 hover:text-brand hover:decoration-brand";

function thread(id: string): Thread {
  const found = getThread(id);
  if (!found) throw new Error(`Guide: turra ${id} not in the database`);
  return found;
}

export default function StartHere() {
  const path = guide.path.map((step) => ({ ...step, thread: thread(step.id) }));
  const series = guide.series.map((s) => {
    const parts = s.parts.map((part) => ({ ...part, thread: thread(part.id) }));
    const years = [...new Set(parts.map((part) => yearOf(part.thread)))];
    return { ...s, parts, years: years.length > 1 ? `${years[0]}-${years.at(-1)}` : years[0] };
  });
  const glossary = new Map(listGlossary().map((term) => [term.slug, term]));
  const ideas = guide.ideas.filter((idea) => glossary.has(idea.slug));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-4xl font-bold text-whiskey-950 sm:text-5xl">Por dónde empezar</h1>
      <p className="mt-5 text-lg leading-relaxed text-whiskey-900">
        Recuenco publica una turra cada sábado desde 2018 y ya van {getSiteStats().threads}. No hace falta leerlas todas, ni por
        orden de fecha: con estas ocho, en este orden, tienes el vocabulario y las ideas con las que se entiende el resto.
      </p>

      <h2 className="mt-14 border-b-2 border-whiskey-900 pb-2 font-serif text-2xl font-bold text-whiskey-950">
        Ocho turras para empezar
      </h2>
      <ol>
        {path.map((step, index) => (
          <li key={step.id} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-b border-whiskey-200 py-7">
            <span className="font-serif text-3xl font-bold leading-none text-brand">{index + 1}</span>
            <div>
              <blockquote className="font-serif text-xl leading-snug text-whiskey-950">
                <Link href={`/turra/${step.id}#${step.tweetId}`} className="hover:text-brand">
                  «{step.quote}»
                </Link>
              </blockquote>
              <p className="mt-3 text-sm text-whiskey-800">
                <Link href={`/turra/${step.id}`} className={link}>
                  {step.thread.title}
                </Link>
                <span className="whitespace-nowrap">
                  {" "}
                  · {yearOf(step.thread)} · {minutesOf(step.thread)} min
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-16 border-b-2 border-whiskey-900 pb-2 font-serif text-2xl font-bold text-whiskey-950">
        Los cuatro pilares de la resolución de problemas complejos (CPS)
      </h2>
      <p className="mt-4 leading-relaxed text-whiskey-900">
        El CPS{" "}
        <Link href={`/turra/${pillars.threadId}#${pillars.intro.tweetId}`} className={link}>
          «{pillars.intro.quote}»
        </Link>
        . Por eso no hay un libro que lo explique entero, y por eso las turras saltan de la psicología a la tecnología y de ahí
        a la estrategia.
      </p>
      <div className="mt-6 grid items-center gap-8 sm:grid-cols-[21rem_1fr]">
        <div className="mx-auto w-full max-w-xs sm:max-w-none">
          <PillarsDiagram pillars={pillars.items} />
        </div>
        <dl className="space-y-5">
          {pillars.items.map((pillar) => (
            <div key={pillar.slug} id={`pilar-${pillar.slug}`} className="scroll-mt-6">
              <dt className="font-serif text-lg font-bold text-whiskey-950">
                <Link href={`/glosario#${pillar.slug}`} className="hover:text-brand">
                  {pillar.name}
                </Link>
              </dt>
              <dd className="mt-1 leading-relaxed text-whiskey-900">
                <Link href={`/turra/${pillars.threadId}#${pillar.tweetId}`} className="hover:text-brand">
                  «{pillar.quote}»
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-6 text-sm text-whiskey-800">
        El esquema es de{" "}
        <Link href={`/turra/${pillars.threadId}#${pillars.attractors.tweetId}`} className={link}>
          {thread(pillars.threadId).title}
        </Link>{" "}
        ({yearOf(thread(pillars.threadId))}).
      </p>

      <section id="atractores" className="mt-10 scroll-mt-6">
        <h3 className="font-serif text-xl font-bold text-whiskey-950">En el centro, los cinco atractores</h3>
        <p className="mt-3 leading-relaxed text-whiskey-900">
          Son las{" "}
          <Link href="/glosario#atractores" className={link}>
            fuerzas de fondo
          </Link>{" "}
          que empujan mercados y sociedades durante años y afectan a los cuatro pilares. No son fijos: la primera versión es de
          2016 y en diciembre de 2025 llegó la de 2026, porque{" "}
          <Link href={`/turra/${attractors.threadId}#${attractors.intro.tweetId}`} className={link}>
            «{attractors.intro.quote}»
          </Link>
          .
        </p>
        <div className="mt-5 hidden grid-cols-[1fr_1.4fr] gap-x-6 border-b border-whiskey-300 pb-2 text-sm font-medium text-whiskey-800 sm:grid">
          <span>Versión original (2016)</span>
          <span>Versión 2026</span>
        </div>
        <ol>
          {attractors.changes.map((change) => (
            <li key={change.after} className="grid gap-x-6 gap-y-2 border-b border-whiskey-200 py-4 sm:grid-cols-[1fr_1.4fr]">
              <div className="text-whiskey-800">
                {change.before.length === 0 ? (
                  <span className="italic">No existía</span>
                ) : change.beforeSource ? (
                  <Link href={`/turra/${change.beforeSource.id}#${change.beforeSource.tweetId}`} className="hover:text-brand">
                    {change.before.join(" + ")}
                  </Link>
                ) : (
                  change.before.join(" + ")
                )}
              </div>
              <div>
                <p className="font-serif text-lg font-bold text-whiskey-950">
                  <span aria-hidden className="mr-2 text-whiskey-500 sm:hidden">
                    →
                  </span>
                  {change.after}
                </p>
                <Link
                  href={`/turra/${attractors.threadId}#${change.tweetId}`}
                  className="mt-1 block text-sm leading-relaxed text-whiskey-900 hover:text-brand"
                >
                  «{change.quote}»
                </Link>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-whiskey-800">
          Los explica en{" "}
          <Link href={`/turra/${attractors.threadId}`} className={link}>
            {thread(attractors.threadId).title}
          </Link>{" "}
          ({yearOf(thread(attractors.threadId))}).
        </p>
      </section>

      <h2 className="mt-16 border-b-2 border-whiskey-900 pb-2 font-serif text-2xl font-bold text-whiskey-950">
        Series para leer seguidas
      </h2>
      <p className="mt-4 leading-relaxed text-whiskey-900">
        Cuando un tema no cabe en un sábado, se reparte en varias turras. Se entienden mejor de corrido.
      </p>
      <div className="mt-2 gap-10 sm:columns-2">
        {series.map((s) => (
          <section key={s.slug} id={s.slug} className="break-inside-avoid scroll-mt-6 pt-6">
            <h3 className="font-serif text-lg font-bold text-whiskey-950">
              {s.name}
              <span className="ml-2 font-sans text-sm font-normal text-whiskey-700">
                {s.parts.length} turras · {s.years}
                {s.ongoing ? " · sigue abierta" : ""}
              </span>
            </h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-whiskey-900 marker:text-whiskey-700">
              {s.parts.map((part) => (
                <li key={part.id}>
                  <Link href={`/turra/${part.id}`} className="hover:text-brand hover:underline">
                    {part.label}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <h2 className="mt-16 border-b-2 border-whiskey-900 pb-2 font-serif text-2xl font-bold text-whiskey-950">
        Ideas con nombre propio
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-whiskey-900">
        Algunas ideas de las turras acabaron teniendo nombre y hoy son vocabulario de la comunidad:{" "}
        {ideas.map((idea, index) => (
          <span key={idea.slug}>
            <Link href={`/glosario#${idea.slug}`} className={`${link} text-whiskey-950`}>
              {idea.label}
            </Link>
            {index < ideas.length - 2 ? ", " : index === ideas.length - 2 ? " y " : ""}
          </span>
        ))}
        . Las tienes explicadas, con la turra de donde salen, en el{" "}
        <Link href="/glosario" className={link}>
          glosario
        </Link>
        .
      </p>

      <p className="mt-16 border-t border-whiskey-200 pt-6 text-sm text-whiskey-800">
        ¿Prefieres ir a tu aire?{" "}
        <Link href="/turras" className={link}>
          Todas las turras, con filtros
        </Link>{" "}
        o{" "}
        <Link href="/turras?orden=interaccion" className={link}>
          las que más interacción tuvieron
        </Link>
        .
      </p>
    </main>
  );
}
