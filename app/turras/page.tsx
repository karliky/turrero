import type { Metadata } from "next";
import { ThreadList } from "../components/ThreadList";
import { getSiteStats, listAuthors, listCategories, listThreadsForArchive } from "@/lib/queries";
import { SITE } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Todas las turras",
  description: `Las ${getSiteStats().threads} turras de ${SITE.byline}, filtrables por año, categoría y autor.`,
  path: "/turras",
});

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
