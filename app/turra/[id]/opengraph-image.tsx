import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/archive';
import { OG_SIZE, renderShareCard } from '@/lib/og';
import { getThread, listThreadIds } from '@/lib/queries';
import { SITE } from '@/lib/site';
import { readingMinutes } from '@/lib/text';

export const alt = `${SITE.name} - Las turras de ${SITE.byline}`;
export const size = OG_SIZE;
export const contentType = 'image/png';

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
