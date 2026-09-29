import { describe, expect, test } from 'vitest';
import { excerpt, pageMetadata } from '../lib/seo';
import { SITE } from '../lib/site';

describe('page metadata', () => {
  test('every page gets the full Open Graph and X cards, with the default image', () => {
    const meta = pageMetadata({ title: 'Glosario CPS', description: 'Conceptos.', path: '/glosario' });
    expect(meta.title).toBe(`Glosario CPS | ${SITE.name}`);
    expect(meta.alternates).toEqual({ canonical: '/glosario' });
    expect(meta.openGraph).toMatchObject({
      title: 'Glosario CPS',
      description: 'Conceptos.',
      url: '/glosario',
      siteName: SITE.name,
      locale: 'es_ES',
      type: 'website',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      site: SITE.xHandle,
      title: 'Glosario CPS',
      description: 'Conceptos.',
      images: [{ url: '/opengraph-image' }],
    });
  });

  test('turras are articles with date, author and section, and keep their own card', () => {
    const meta = pageMetadata({
      title: 'Una turra',
      description: 'Empieza así.',
      path: '/turra/1',
      ownImage: true,
      article: { publishedTime: '2024-01-06T09:00:00.000Z', author: 'Javier G. Recuenco', authorHandle: 'Recuenco', section: 'Estrategia' },
    });
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2024-01-06T09:00:00.000Z',
      authors: ['https://x.com/Recuenco'],
      section: 'Estrategia',
    });
    expect(meta.openGraph).not.toHaveProperty('images');
    expect(meta.twitter).toMatchObject({ creator: '@Recuenco' });
  });

  test('descriptions are cut at a word, without links', () => {
    expect(excerpt('Hoy hablo de algo https://t.co/abc   corto')).toBe('Hoy hablo de algo corto');
    const long = excerpt('palabra '.repeat(40), 30);
    expect(long.length).toBeLessThanOrEqual(31);
    expect(long.endsWith('palabra…')).toBe(true);
  });
});
