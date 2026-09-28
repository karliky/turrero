import type { MetadataRoute } from 'next';
import { listAuthors, listCategories, listNewest } from '@/lib/queries';
import { SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const threads = listNewest(Number.MAX_SAFE_INTEGER);
  const lastModified = threads[0] ? new Date(threads[0].publishedAt) : undefined;

  const staticPages = [
    { path: '', priority: 1 },
    { path: '/turras', priority: 0.9 },
    { path: '/glosario', priority: 0.8 },
    { path: '/biblioteca', priority: 0.8 },
    { path: '/mapa-de-ideas', priority: 0.7 },
    { path: '/empieza-aqui', priority: 0.9 },
    { path: '/ebook', priority: 0.7 },
    { path: '/sobre-esta-web', priority: 0.5 },
    { path: '/contacto', priority: 0.5 },
  ].map(({ path, priority }) => ({ url: `${SITE.url}${path}`, lastModified, priority }));

  return [
    ...staticPages,
    ...listCategories().map((category) => ({ url: `${SITE.url}/${category.slug}`, lastModified, priority: 0.9 })),
    ...listAuthors().map((author) => ({ url: `${SITE.url}/autor/${author.handle}`, lastModified, priority: 0.7 })),
    ...threads.map((thread) => ({
      url: `${SITE.url}/turra/${thread.id}`,
      lastModified: new Date(thread.publishedAt),
      priority: 0.6,
    })),
  ];
}
