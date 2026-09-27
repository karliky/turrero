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
  description: string;
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
  podcastUrl: string | null;
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

export interface Book {
  url: string;
  title: string;
  imageUrl: string | null;
  categories: string[];
  mentions: { threadId: string; tweetId: string; authorHandle: string }[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  reference: string | null;
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
