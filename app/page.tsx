import type { Metadata } from 'next';
import { CategoryCard } from './components/CategoryCard';
import { Masthead } from './components/Masthead';
import { pickUnique } from '@/lib/archive';
import {
  getSiteStats,
  getThread,
  listCategories,
  listNewest,
  listThreadsByCategory,
  listTopByEngagement,
} from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';
import { websiteLd } from '@/lib/structured-data';
import { JsonLd } from './components/JsonLd';
import { SITE } from '@/lib/site';

// The share card is app/opengraph-image.tsx
export const metadata: Metadata = pageMetadata({
  title: `Las turras de ${SITE.byline}`,
  description: SITE.description,
  path: '/',
  ownImage: true,
});

const THREADS_PER_LIST_CARD = 10;
const THREADS_PER_CATEGORY_CARD = 10;

export default function Home() {
  const stats = getSiteStats();
  const newestThreads = listNewest(100);
  const latest = getThread(newestThreads[0]!.id)!;
  // Categories with most turras first (ties keep the editorial order of listCategories)
  const categories = listCategories()
    .map((category) => ({ category, threads: listThreadsByCategory(category.slug) }))
    .sort((a, b) => b.threads.length - a.threads.length);

  // Each turra is shown once when possible: Top first, then the newest, then categories in that order
  const categoryThreads = categories.map(({ threads }) => threads);
  // The latest turra leads the masthead, so the lists below skip it
  const [, top = [], newest = [], ...byCategory] = pickUnique([
    { threads: newestThreads.slice(0, 1), limit: 1 },
    { threads: listTopByEngagement(100), limit: THREADS_PER_LIST_CARD },
    { threads: newestThreads, limit: THREADS_PER_LIST_CARD },
    // Small categories are topped up with turras shown above so every card lists the same number
    ...categoryThreads.map((threads) => ({ threads, limit: THREADS_PER_CATEGORY_CARD, fill: true })),
  ]);

  const categoryCards = categories.map(({ category }, index) => ({
    key: category.slug,
    title: category.name,
    threads: byCategory[index] ?? [],
    href: `/${category.slug}`,
    linkLabel: `Ver las ${categoryThreads[index]?.length ?? 0} turras`,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <JsonLd data={websiteLd()} />
      <Masthead
        totalThreads={stats.threads}
        latest={latest}
      />

      {/* The two lists get their own row so the 15 categories fill complete rows of three */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <CategoryCard title="Top 10 turras" threads={top} href="/turras?orden=interaccion" linkLabel="Ver por interacción" showStats />
        <CategoryCard title="Las más nuevas" threads={newest} href="/turras" linkLabel="Ver todas las turras" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryCards.map(({ key, ...card }) => (
          <CategoryCard key={key} {...card} />
        ))}
      </div>
    </div>
  );
}
