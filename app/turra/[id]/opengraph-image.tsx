import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/archive';
import { OG_SIZE, renderShareCard } from '@/lib/og';
import { getThread, listThreadIds } from '@/lib/queries';
import { SITE } from '@/lib/site';
import { readingMinutes } from '@/lib/text';

export const alt = `Tarjeta de ${SITE.name} con el título, el autor y la fecha de la turra`;
export const size = OG_SIZE;
export const contentType = 'image/png';

// Only the pre-rendered cards exist: an unknown path is a static 404, not a function call
export const dynamicParams = false;

export function generateStaticParams() {
  return listThreadIds().map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const thread = getThread((await params).id);
  if (!thread) notFound();

  const minutes = readingMinutes(thread.tweets.map((tweet) => tweet.text));
  return renderShareCard({
    label: thread.categories[0]?.name ?? 'Turra',
    title: thread.title,
    byline: `${thread.author.name} · ${formatDate(thread.publishedAt)}`,
    highlight: `${thread.tweets.length} tweets · ${minutes} min de lectura`,
  });
}
