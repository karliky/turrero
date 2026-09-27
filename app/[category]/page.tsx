import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ThreadList } from "../components/ThreadList";
import { getCategory, listCategories, listThreadsByCategory } from "@/lib/queries";
import { SITE } from "@/lib/site";

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
  return {
    title: `${category.name} - ${SITE.name}`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: Params) {
  const category = getCategory((await params).category);
  if (!category) notFound();

  return (
    <ThreadList
      title={category.name}
      description={category.description}
      threads={listThreadsByCategory(category.slug)}
      showAuthor
    />
  );
}
