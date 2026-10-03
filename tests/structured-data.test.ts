import { describe, expect, test } from 'vitest';
import { articleLd, breadcrumbLd, definedTermLd, personLd, serializeLd, websiteLd } from '../lib/structured-data';
import { SITE } from '../lib/site';

describe('structured data', () => {
  test('a turra is an Article with author, publisher, date and image', () => {
    const ld = articleLd({
      id: '1',
      title: 'Una turra',
      description: 'Resumen.',
      publishedAt: '2024-01-06T09:00:00.000Z',
      author: { name: 'Javier G. Recuenco', handle: 'Recuenco' },
      section: 'Estrategia',
    });
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Una turra',
      datePublished: '2024-01-06T09:00:00.000Z',
      articleSection: 'Estrategia',
      author: { '@type': 'Person', name: 'Javier G. Recuenco', sameAs: ['https://x.com/Recuenco'] },
      publisher: { '@type': 'Organization', name: SITE.name },
      mainEntityOfPage: `${SITE.url}/turra/1`,
      image: `${SITE.url}/turra/1/opengraph-image`,
    });
  });

  test('long headlines are cut at a word, under the 110 characters Google shows', () => {
    const headline = articleLd({
      id: '1',
      title: 'palabra '.repeat(30).trim(),
      description: '',
      publishedAt: '2024-01-06T09:00:00.000Z',
      author: { name: 'A', handle: 'a' },
      section: null,
    }).headline as string;
    expect(headline.length).toBeLessThanOrEqual(110);
    expect(headline.endsWith('palabra…')).toBe(true);
  });

  test('breadcrumbs start at the home page and number their items', () => {
    expect(breadcrumbLd([['Glosario', '/glosario']])).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Inicio', item: SITE.url },
        { position: 2, name: 'Glosario', item: `${SITE.url}/glosario` },
      ],
    });
  });

  test('glossary terms, people and the site', () => {
    expect(definedTermLd({ slug: 'rabbit-hole', term: 'Rabbit hole', short: 'Definición.' })).toMatchObject({
      '@type': 'DefinedTerm',
      url: `${SITE.url}/glosario/rabbit-hole`,
      inDefinedTermSet: `${SITE.url}/glosario`,
    });
    expect(personLd({ name: 'X', handle: 'x' })).not.toHaveProperty('description');
    expect(websiteLd()).toMatchObject({ '@type': 'WebSite', url: SITE.url });
  });

  test('serialized JSON can never close its <script> tag', () => {
    const out = serializeLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
