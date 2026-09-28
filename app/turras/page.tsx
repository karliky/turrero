import type { Metadata } from "next";
import { ThreadList } from "../components/ThreadList";
import { listAuthors, listCategories, listThreadsForArchive } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Todas las turras - ${SITE.name}`,
  description: `Archivo completo de ${SITE.name}, filtrable por año, categoría y autor.`,
};

export default function ArchivePage() {
  return (
    <ThreadList
      title="Todas las turras"
      threads={listThreadsForArchive()}
      categories={listCategories()}
      authors={listAuthors()}
      defaultAuthor={SITE.featuredAuthor}
      showAuthor
    />
  );
}
