import type { Author } from "@/lib/types";
import { SITE, authorUrl } from "@/lib/site";

interface HeaderDescriptionProps {
  totalThreads: number;
  lastPublishedAt: string | null;
  featuredAuthor: Author | null;
}

const linkClassName =
  "font-semibold text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 underline decoration-whiskey-300 hover:decoration-whiskey-500";

export function HeaderDescription({ totalThreads, lastPublishedAt, featuredAuthor }: HeaderDescriptionProps) {
  const lastUpdate = lastPublishedAt
    ? new Date(lastPublishedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <header className="max-w-3xl mx-auto mb-12 text-center">
      <p className="text-whiskey-800 leading-relaxed">
        Esta es la colección curada y ordenada de las publicaciones de{" "}
        {featuredAuthor && (
          <>
            <a className={linkClassName} href={authorUrl(featuredAuthor.handle)} target="_blank" rel="noopener noreferrer">
              {featuredAuthor.name}
            </a>{" "}
            y la{" "}
          </>
        )}
        <a className={linkClassName} href={SITE.community.youtube} target="_blank" rel="noopener noreferrer">
          {SITE.community.name}
        </a> sobre las ciencias de la complejidad, CPS, Factor-X, etc.
        <br className="hidden sm:block" />
        <span className="block mt-3">
          Hay un total de{" "}
          <strong className="font-semibold text-whiskey-900">{totalThreads}</strong> turras
          {lastPublishedAt && lastUpdate && (
            <>
              , la última actualización fue el{" "}
              <time className="font-semibold text-whiskey-900" dateTime={lastPublishedAt}>
                {lastUpdate}
              </time>
            </>
          )}
          .
        </span>
      </p>
    </header>
  );
}
