// Metadata of every page: title, description, canonical and the complete Open Graph and X (Twitter) cards.
// Next replaces a page's `openGraph`/`twitter` objects instead of merging them with the layout's, so a page that
// only set a title lost og:url, og:site_name, og:locale, og:type and twitter:site. Building them here keeps
// every page complete and consistent.
import type { Metadata } from 'next';
import { SITE } from './site';

export interface PageMeta {
  /** Page title without the site name (the name is added to <title> and shown by og:site_name). */
  title: string;
  description: string;
  /** Path of the page, e.g. "/glosario": canonical and og:url. */
  path: string;
  /**
   * The page has its own share card (a colocated opengraph-image file), which Next adds by itself;
   * otherwise the site's default card is used.
   */
  ownImage?: boolean;
  /** Turras: shared as articles, with date, author and section. */
  article?: { publishedTime: string; author: string; authorHandle: string; section: string | null } | null;
}

// The site's general card (app/opengraph-image.tsx); its alt describes that image, not the page
const DEFAULT_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: `${SITE.name}: las turras de ${SITE.byline}`,
};

/**
 * Opening of a turra without the ritual formula it starts with («En el hilo turras de hoy, vamos a hablar de…»),
 * which says nothing in a search result. The rest of the sentence keeps its words, with a capital letter.
 */
export function stripTurraOpening(text: string): string {
  const stripped = text
    // «En el hilo turras de hoy,» «En nuestro hilo coñazo de hoy» «En el hilo del sábado de hoy»
    .replace(/^\s*en\s+(?:el|este|nuestro)\s+hilo(?:\s+[\wáéíóúñ]+)?\s+(?:del\s+sábado\s+)?de\s+hoy\s*,?\s*/i, '')
    // «vamos a hablar de…» «hablaré sobre…»
    .replace(/^(?:vamos a hablar|voy a hablar|hablaremos|hablaré)\s+(?:de|sobre)\s+/i, '')
    .trim();
  if (!stripped) return text.trim();
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Search description of a turra. When the turra is where a glossary term is explained, it opens with the term's
 * definition (people search «qué es un rabbit hole», not the first tweet). Otherwise, its opening without the
 * ritual formula, led by the title when that opening says too little on its own.
 */
export function turraDescription({
  title,
  opening,
  term,
}: {
  title: string;
  opening: string;
  term: { term: string; short: string } | null;
}): string {
  const body = stripTurraOpening(opening.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim());
  if (term) return excerpt(`${term.term}: ${term.short} ${body}`);
  const thin = body.length < 80 || /[:…]$/.test(body);
  return excerpt(thin ? `${title}. ${body}` : body);
}

/** Longest description social networks and search engines show without cutting mid-word. */
export function excerpt(text: string, max = 160): string {
  const clean = text.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', max - 1))}…`;
}

export function pageMetadata({ title, description, path, ownImage = false, article = null }: PageMeta): Metadata {
  return {
    title: `${title} | ${SITE.name}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE.name,
      locale: 'es_ES',
      ...(ownImage ? {} : { images: [DEFAULT_IMAGE] }),
      ...(article
        ? {
            type: 'article',
            publishedTime: article.publishedTime,
            authors: [`https://x.com/${article.authorHandle}`],
            ...(article.section ? { section: article.section } : {}),
          }
        : { type: 'website' }),
    },
    twitter: {
      card: 'summary_large_image',
      site: SITE.xHandle,
      ...(article ? { creator: `@${article.authorHandle}` } : {}),
      title,
      description,
      ...(ownImage ? {} : { images: [DEFAULT_IMAGE] }),
    },
  };
}
