import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ThreadList } from "../../components/ThreadList";
import { getAuthor, listAuthors, listThreadsForArchive } from "@/lib/queries";
import { SITE, authorUrl } from "@/lib/site";
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
  return pageMetadata({
    title: `Turras de ${author.name}`,
    description: `Todas las turras de ${author.name} (@${author.handle}) archivadas en ${SITE.name}.`,
    path: `/autor/${author.handle}`,
  });
}

export default async function AuthorPage({ params }: Params) {
  const author = getAuthor((await params).handle);
  if (!author) notFound();

  return (
    <ThreadList
      title={`Turras de ${author.name}`}
      threads={listThreadsForArchive().filter((thread) => thread.authorHandle === author.handle)}
    >
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
