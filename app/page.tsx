import React from 'react';
import { CategoryCard } from './components/CategoryCard';
import { AdvertisementCard } from './components/AdvertisementCard';
import { HeaderDescription } from './components/HeaderDescription';
import {
  getAuthor,
  getSiteStats,
  listCategories,
  listNewest,
  listThreadsByCategory,
  listThreadsNotByAuthor,
  listTopByEngagement,
} from '@/lib/queries';
import { SITE } from '@/lib/site';

const AD_AFTER_CARD = 5;
const THREADS_PER_CATEGORY_CARD = 10;

export default function Home() {
  const stats = getSiteStats();
  const featuredAuthor = getAuthor(SITE.featuredAuthor);

  const cards = [
    { key: 'top', title: 'Top 25 turras', threads: listTopByEngagement(25), showStats: true },
    { key: 'newest', title: 'Las más nuevas', threads: listNewest(25), showStats: true },
    { key: 'others', title: 'Otros autores', threads: listThreadsNotByAuthor(SITE.featuredAuthor), showStats: true },
    ...listCategories().map((category) => ({
      key: category.slug,
      title: category.name,
      href: `/${category.slug}`,
      threads: listThreadsByCategory(category.slug).slice(0, THREADS_PER_CATEGORY_CARD),
      showStats: false,
    })),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <HeaderDescription
        totalThreads={stats.threads}
        lastPublishedAt={stats.lastPublishedAt}
        featuredAuthor={featuredAuthor}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ key, ...card }, index) => (
          <React.Fragment key={key}>
            <CategoryCard {...card} />
            {index === AD_AFTER_CARD && <AdvertisementCard />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
