import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ThreadList } from "../components/ThreadList";
import { getCategory, listCategories, listThreadsForArchive } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

interface Params {
  params: Promise<{ category: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return listCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const category = getCategory((await params).category);
  if (!category) return {};
  // The share card is the colocated opengraph-image.tsx
  return pageMetadata({ title: `Turras sobre ${category.name}`, description: category.description, path: `/${category.slug}`, ownImage: true });
}

export default async function CategoryPage({ params }: Params) {
  const category = getCategory((await params).category);
  if (!category) notFound();

  return (
    <ThreadList
      title={category.name}
      description={category.intro || category.description}
      threads={listThreadsForArchive().filter((thread) => thread.categories.includes(category.slug))}
      showAuthor
    />
  );
}
