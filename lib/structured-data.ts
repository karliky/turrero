// Structured data (schema.org JSON-LD) for search engines. Pure builders: the pages pass them to <JsonLd>.
import { SITE, authorUrl } from './site';

type Thing = Record<string, unknown>;

const absolute = (path: string) => `${SITE.url}${path === '/' ? '' : path}`;

const publisher: Thing = { '@type': 'Organization', name: SITE.name, url: SITE.url };

export function personLd(person: { name: string; handle: string; description?: string | null; path?: string | null }): Thing {
  return {
    '@type': 'Person',
    name: person.name,
    ...(person.description ? { description: person.description } : {}),
    ...(person.path ? { url: absolute(person.path) } : {}),
    sameAs: [authorUrl(person.handle)],
  };
}

/** Inicio › … › page. Items are [name, path]; the last one is the current page. */
export function breadcrumbLd(items: [string, string][]): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [['Inicio', '/'] as [string, string], ...items].map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absolute(path),
    })),
  };
}

export function websiteLd(): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: 'es',
    publisher,
  };
}

export function articleLd(turra: {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  author: { name: string; handle: string };
  section: string | null;
}): Thing {
  const path = `/turra/${turra.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    // Google shows headlines up to 110 characters
    headline: turra.title.length > 110 ? `${turra.title.slice(0, turra.title.lastIndexOf(' ', 109))}…` : turra.title,
    description: turra.description,
    datePublished: turra.publishedAt,
    inLanguage: 'es',
    ...(turra.section ? { articleSection: turra.section } : {}),
    author: personLd({ name: turra.author.name, handle: turra.author.handle, path: `/autor/${turra.author.handle}` }),
    publisher,
    mainEntityOfPage: absolute(path),
    image: absolute(`${path}/opengraph-image`),
  };
}

export function definedTermLd(term: { slug: string; term: string; short: string }): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.term,
    description: term.short,
    url: absolute(`/glosario/${term.slug}`),
    inDefinedTermSet: absolute('/glosario'),
  };
}

export function definedTermSetLd(terms: { slug: string; term: string; short: string }[]): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: `Glosario CPS de ${SITE.name}`,
    url: absolute('/glosario'),
    inLanguage: 'es',
    hasDefinedTerm: terms.map((term) => ({
      '@type': 'DefinedTerm',
      name: term.term,
      description: term.short,
      url: absolute(`/glosario/${term.slug}`),
    })),
  };
}

export function collectionLd(page: { name: string; description: string; path: string }): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    description: page.description,
    url: absolute(page.path),
    inLanguage: 'es',
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
  };
}

/** Serialized for a <script> tag: `<` escaped so the content can never close the tag. */
export function serializeLd(data: Thing | Thing[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
