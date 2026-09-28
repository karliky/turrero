// Domain model shared by the site, the ingestion and the tests.

export interface Author {
  handle: string;
  name: string;
  xUserId: string | null;
  avatarUrl: string | null;
}

export interface Category {
  slug: string;
  name: string;
  description: string; // meta description (≈155 characters)
  intro: string; // introduction shown on the category page
  criteria: string; // what belongs, what does not and tie-breaks: guides classification
}

export interface TweetStats {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  views: number;
}

export interface Media {
  kind: 'photo' | 'video' | 'gif';
  url: string;
  posterUrl: string | null;
  alt: string | null;
}

export interface Link {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export interface Quote {
  quotedId: string | null;
  authorHandle: string | null;
  authorName: string | null;
  text: string;
  media: Media[];
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  stats: TweetStats;
  media: Media[];
  links: Link[];
  quote: Quote | null;
}

export interface ExamQuestion {
  question: string;
  options: string[];
  answer: number; // 0-based index into options
}

export interface Thread {
  id: string;
  title: string;
  publishedAt: string;
  author: Author;
  categories: Category[];
  tweets: Tweet[];
  exam: ExamQuestion[] | null;
}

/** Lightweight row used by lists (home, categories, authors). */
export interface ThreadSummary {
  id: string;
  title: string;
  publishedAt: string;
  authorHandle: string;
  authorName: string;
  stats: TweetStats; // stats of the root tweet
}

export interface ArchiveThread extends ThreadSummary {
  categories: string[]; // category slugs, in the thread's order
}

export interface Book {
  url: string;
  title: string;
  author: string | null;
  imageUrl: string | null;
  categories: string[];
  mentions: { threadId: string; tweetId: string; authorHandle: string }[];
}

export const GLOSSARY_GROUPS = {
  oficio: 'El oficio del CPS',
  complejidad: 'Complejidad y sensemaking',
  personas: 'Personas y Factor X',
  estrategia: 'Estrategia y organizaciones',
  sociedad: 'Sociedad y relato',
  tecnologia: 'Tecnología e IA',
} as const;
export type GlossaryGroup = keyof typeof GLOSSARY_GROUPS;

export interface GlossaryTerm {
  slug: string;
  term: string;
  short: string; // one-line definition (tooltips in the turras)
  body: string;
  origin: string | null;
  group: GlossaryGroup;
  aliases: string[];
  related: string[]; // slugs
  /** Turras that explain the term; the title is resolved from the threads table. */
  sources: { threadId: string; tweetId: string | null; title: string }[];
  domains: { name: string; text: string }[] | null; // Cynefin only
}

/** A turra as the idea map needs it: enough to link it and place it in time. */
export interface MapThread {
  id: string;
  title: string;
  publishedAt: string;
}

/** A glossary concept and the turras that mention it (presence, not number of mentions), newest first. */
export interface ConceptRow {
  slug: string;
  term: string;
  short: string;
  group: GlossaryGroup;
  threads: string[];
}

/** Turra `from` quotes a tweet of the older turra `to`. */
export interface Citation {
  from: string;
  to: string;
}

/** Search hit: best matching tweet of a thread. */
export interface SearchResult {
  threadId: string;
  tweetId: string;
  title: string;
  publishedAt: string;
  /** Matched text; matches are wrapped in SEARCH_MARK_START / SEARCH_MARK_END. */
  snippet: string;
}

export const SEARCH_MARK_START = '\u0002';
export const SEARCH_MARK_END = '\u0003';
