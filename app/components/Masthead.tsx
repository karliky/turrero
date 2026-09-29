import Link from "next/link";
import { SITE, authorUrl } from "@/lib/site";
import { readingMinutes } from "@/lib/text";
import type { Thread } from "@/lib/types";

interface MastheadProps {
  totalThreads: number;
  latest: Thread;
}

/** "sábado 26 de septiembre de 2026", in Madrid time. */
function longDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  })
    .format(new Date(iso))
    .replace(",", "");
}

/** Recuenco's opening words, as he wrote them, without links. */
function opening(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

const link = "underline decoration-whiskey-300 underline-offset-4 hover:text-brand hover:decoration-brand";

/** Top of the home page: the name of the Post and this week's turra, opened with Recuenco's own words. */
export function Masthead({ totalThreads, latest }: MastheadProps) {
  return (
    <section aria-labelledby="latest-title" className="mb-12">
      <div className="relative isolate border-b border-whiskey-300 pb-10 pt-8 text-center sm:pb-14 sm:pt-12">
        {/* An 18th-century celestial chart, barely visible behind the name (credited in /sobre-esta-web) */}
        <div aria-hidden className="hero-sky pointer-events-none absolute inset-x-0 -top-8 bottom-0 -z-10" />
        <h1 className="font-serif text-5xl font-bold tracking-tight text-whiskey-950 sm:text-6xl">
          El <span className="text-brand">Turrero Post</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl font-serif text-lg italic text-whiskey-800">
          Un punto de encuentro para la comunidad de resolución de problemas complejos. Incluye la colección curada y ordenada de las turras de{" "}
          <a href={authorUrl("Recuenco")} target="_blank" rel="noopener noreferrer" className={link}>
            Javier G. Recuenco
          </a>{" "}
          y la{" "}
          <a href={SITE.community.youtube} target="_blank" rel="noopener noreferrer" className={link}>
            Comunidad CPS
          </a>{" "}
          sobre ciencias de la complejidad, CPS y Factor X.
        </p>
      </div>

      <div className="mx-auto max-w-3xl pt-8">
        <p className="text-sm text-whiskey-800">
          La última, del <time dateTime={latest.publishedAt}>{longDate(latest.publishedAt)}</time>:
        </p>
        <h2 id="latest-title" className="mt-1 font-serif text-3xl font-bold leading-tight text-whiskey-950 sm:text-4xl">
          <Link href={`/turra/${latest.id}`} className="hover:text-brand">
            {latest.title}
          </Link>
        </h2>
        {latest.tweets[0] && (
          <blockquote className="mt-4 border-l-2 border-whiskey-300 pl-4 text-lg leading-relaxed text-whiskey-900">
            {opening(latest.tweets[0].text)}
          </blockquote>
        )}
        <p className="mt-4 text-whiskey-900">
          <Link href={`/turra/${latest.id}`} className={`font-semibold ${link}`}>
            Leer la turra
          </Link>
          <span className="text-whiskey-800">
            {" "}
            · {latest.tweets.length} tweets, {readingMinutes(latest.tweets.map((tweet) => tweet.text))} minutos
          </span>
        </p>

        <p className="mt-8 border-t border-whiskey-200 pt-5 text-whiskey-900">
          ¿Es tu primera vez? No empieces por la última:{" "}
          <Link href="/empieza-aqui" className={link}>
            estas ocho turras, en orden
          </Link>
          , te dan lo necesario para entender el resto. Y si buscas algo concreto, tienes las {totalThreads}{" "}
          <Link href="/turras" className={link}>
            ordenadas por año y tema
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
