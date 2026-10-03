import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ThreadList } from "../../components/ThreadList";
import { getAuthor, listAuthors, listThreadsForArchive } from "@/lib/queries";
import Link from "next/link";
import { FEATURED_AUTHOR_BIO, SITE, authorUrl } from "@/lib/site";
import { personLd } from "@/lib/structured-data";
import { JsonLd } from "../../components/JsonLd";
import { pageMetadata } from "@/lib/seo";

interface Params {
  params: Promise<{ handle: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return listAuthors().map((author) => ({ handle: author.handle }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const author = getAuthor((await params).handle);
  if (!author) return {};
  // The featured author's page answers who he is: it is what people search his name for
  if (author.handle === SITE.featuredAuthor) {
    return pageMetadata({
      title: `${author.name}: quién es, sus libros recomendados y sus turras`,
      description: `Quién es ${author.name}, divulgador de la resolución de problemas complejos (CPS) y fundador de Singular Solving, y todas sus turras ordenadas por tema y por año.`,
      path: `/autor/${author.handle}`,
    });
  }
  return pageMetadata({
    title: `Turras de ${author.name}`,
    description: `Todas las turras de ${author.name} (@${author.handle}) archivadas en ${SITE.name}.`,
    path: `/autor/${author.handle}`,
  });
}

export default async function AuthorPage({ params }: Params) {
  const author = getAuthor((await params).handle);
  if (!author) notFound();

  const featured = author.handle === SITE.featuredAuthor;
  const link = "underline decoration-whiskey-300 underline-offset-4 hover:text-brand hover:decoration-brand";
  return (
    <ThreadList
      title={featured ? author.name : `Turras de ${author.name}`}
      threads={listThreadsForArchive().filter((thread) => thread.authorHandle === author.handle)}
    >
      <JsonLd
        data={personLd({
          name: author.name,
          handle: author.handle,
          description: featured ? FEATURED_AUTHOR_BIO[0] : null,
          path: `/autor/${author.handle}`,
        })}
      />
      {featured && (
        <div className="mb-4 max-w-3xl space-y-3 leading-relaxed text-whiskey-900">
          {FEATURED_AUTHOR_BIO.map((paragraph) => (
            <p key={paragraph.slice(0, 20)}>{paragraph}</p>
          ))}
          <p>
            Sus{" "}
            <Link href="/biblioteca" className={link}>
              libros recomendados
            </Link>
            , el{" "}
            <Link href="/glosario" className={link}>
              glosario
            </Link>{" "}
            de sus conceptos y{" "}
            <Link href="/empieza-aqui" className={link}>
              por dónde empezar a leerle
            </Link>
            .
          </p>
        </div>
      )}
      <a
        href={authorUrl(author.handle)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-whiskey-700 hover:text-whiskey-900 underline decoration-whiskey-300"
      >
        @{author.handle} en X
      </a>
    </ThreadList>
  );
}
