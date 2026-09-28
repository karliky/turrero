import { notFound } from 'next/navigation';
import { OG_SIZE, renderShareCard } from '@/lib/og';
import { getCategory, listCategories, listThreadsByCategory } from '@/lib/queries';
import { SITE } from '@/lib/site';

export const alt = `${SITE.name} - Las turras de ${SITE.byline}`;
export const size = OG_SIZE;
export const contentType = 'image/png';

// Only the pre-rendered cards exist: an unknown path is a static 404, not a function call
export const dynamicParams = false;

export function generateStaticParams() {
  return listCategories().map((category) => ({ category: category.slug }));
}

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const category = getCategory((await params).category);
  if (!category) notFound();

  const count = listThreadsByCategory(category.slug).length;
  return renderShareCard({
    label: 'Categoría',
    title: `Turras sobre ${category.name}`,
    byline: SITE.byline,
    highlight: `${count} ${count === 1 ? 'turra' : 'turras'}`,
  });
}
