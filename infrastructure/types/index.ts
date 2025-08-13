/**
 * Consolidated TypeScript type definitions for the Turrero project
 * 
 * This file centralizes all type definitions used across the application,
 * including data structures, API responses, and component props.
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/** Basic tweet statistics from X.com */
export interface TweetStats {
  /** Number of views as string (e.g., "1.2K", "45M") */
  views: string;
  /** Number of retweets as string */
  retweets: string;
  /** Number of quote tweets as string */
  quotetweets: string;
  /** Number of likes as string */
  likes: string;
}

/** Embedded tweet metadata within a tweet */
export interface TweetEmbedMetadata {
  type: string;
  id: string;
  author: string;
  tweet: string;
}

/** Image metadata within a tweet */
export interface TweetImageMetadata {
  img: string;
  url: string;
}

/** Complete tweet metadata structure */
export interface TweetMetadata {
  embed?: TweetEmbedMetadata;
  type?: string;
  imgs?: TweetImageMetadata[];
  img?: string;
  url?: string;
}

/** Core tweet structure as scraped from X.com */
export interface Tweet {
  /** Tweet text content */
  tweet: string;
  /** Unique tweet ID */
  id: string;
  /** Tweet timestamp in ISO format */
  time: string;
  /** Author handle or profile URL */
  author: string;
  /** Additional metadata (images, embeds, etc.) */
  metadata?: TweetMetadata;
  /** Engagement statistics */
  stats: TweetStats;
}

/** Extended tweet with calculated engagement score */
export interface TweetWithEngagement extends Tweet {
  /** Calculated engagement score (likes + retweets + quote tweets) */
  engagement: number;
}

/** Tweet with summary for display in category cards */
export interface TweetWithSummary {
  id: string;
  time: string;
  summary: string;
  stats: TweetStats;
  engagement: number;
}

// ============================================================================
// CATEGORIZATION & ENRICHMENT TYPES
// ============================================================================

/** Tweet categorization mapping */
export interface CategorizedTweet {
  /** Tweet ID */
  id: string;
  /** Comma-separated category names */
  categories: string;
}

/** Tweet summary for display purposes */
export interface TweetSummary {
  /** Tweet ID */
  id: string;
  /** Human-readable summary */
  summary: string;
}

/** Enriched tweet metadata for enhanced display */
export interface EnrichedTweetMetadata {
  /** Tweet ID */
  id: string;
  /** Type of enrichment */
  type: 'card' | 'embed' | 'media';
  /** Image URL for cards/media */
  img?: string;
  /** External URL for cards */
  url?: string;
  /** Media file path */
  media?: string;
  /** Card description */
  description?: string;
  /** Card title */
  title?: string;
  /** Embedded tweet ID */
  embeddedTweetId?: string;
  /** Embedded tweet author */
  author?: string;
  /** Embedded tweet content */
  tweet?: string;
}

// ============================================================================
// EXAMINATION & TESTING TYPES
// ============================================================================

/** Quiz question structure */
export interface QuizQuestion {
  /** Question text */
  question: string;
  /** Array of possible answers */
  options: string[];
  /** Index of correct answer (0-based) */
  answer: number;
}

/** Tweet-based examination/quiz */
export interface TweetExam {
  /** Source tweet ID */
  id: string;
  /** Array of quiz questions */
  questions: QuizQuestion[];
}

// ============================================================================
// GRAPH & ANALYTICS TYPES
// ============================================================================

/** Graph node representing a tweet thread */
export interface TurraNode {
  /** Tweet thread ID */
  id: string;
  /** Thread summary */
  summary: string;
  /** Array of category names */
  categories: string[];
  /** View count (numeric) */
  views: number;
  /** Like count (numeric) */
  likes: number;
  /** Reply count (numeric) */
  replies: number;
  /** Bookmark count (numeric) */
  bookmarks: number;
  /** Related thread IDs */
  related_threads: string[];
}

// ============================================================================
// AUTHOR & IDENTITY TYPES
// ============================================================================

/** Author information structure */
export interface Author {
  /** Display name */
  NAME: string;
  /** X.com profile URL */
  X: string;
  /** YouTube channel URL */
  YOUTUBE: string;
}

/** All supported authors */
export interface Authors {
  /** Main author display name */
  MAIN: string;
  /** CPS Community author */
  CPSCOMUNIDAD: Author;
  /** Victor author */
  VICTOR: Author;
  /** Recuenco author */
  RECUENCO: Author;
}

// ============================================================================
// BOOK & REFERENCE TYPES
// ============================================================================

/** Book reference structure */
export interface BookReference {
  /** Book title */
  title: string;
  /** Book author(s) */
  author: string;
  /** Book description */
  description?: string;
  /** Amazon or external URL */
  url?: string;
  /** Book cover image URL */
  image?: string;
  /** Category classification */
  category?: string;
  /** Source tweet ID that mentioned this book */
  sourceThreadId?: string;
}

/** Enriched book with additional metadata */
export interface EnrichedBook extends BookReference {
  /** ISBN number */
  isbn?: string;
  /** Publication year */
  year?: number;
  /** Publisher name */
  publisher?: string;
  /** Book rating (1-5) */
  rating?: number;
  /** Number of pages */
  pages?: number;
}

// ============================================================================
// PODCAST & MEDIA TYPES
// ============================================================================

/** Podcast episode metadata */
export interface PodcastEpisode {
  /** Source tweet ID */
  id: string;
  /** Episode title */
  title?: string;
  /** Episode description */
  description?: string;
  /** Audio file URL */
  audioUrl?: string;
  /** Episode duration in seconds */
  duration?: number;
  /** Publication date */
  publishedAt?: string;
}

// ============================================================================
// SEARCH & INDEXING TYPES
// ============================================================================

/** Algolia search index structure */
export interface SearchIndexEntry {
  /** Unique identifier */
  objectID: string;
  /** Tweet content for search */
  tweet: string;
  /** Thread summary */
  summary: string;
  /** Author name */
  author: string;
  /** Category tags */
  categories: string[];
  /** Publication timestamp */
  time: string;
  /** Engagement metrics */
  engagement: number;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/** Props for CategoryCard component */
export interface CategoryCardProps {
  /** Category name/identifier */
  category: string;
  /** Array of tweets to display */
  tweets: TweetWithSummary[];
  /** Function to format category title for display */
  formatCategoryTitle: (category: string) => string;
}

/** Props for TweetContent component */
export interface TweetContentProps {
  /** Tweet data to render */
  tweet: Tweet;
  /** HTML element ID for the tweet */
  id: string;
}

/** Props for TweetExam component */
export interface TweetExamProps {
  /** Exam data */
  exam: TweetExam;
  /** Callback when exam is completed */
  onComplete?: (score: number, total: number) => void;
}

/** Props for TweetSidebar component */
export interface TweetSidebarProps {
  /** Current tweet ID */
  currentTweetId: string;
  /** Category for related tweets */
  category?: string;
  /** Maximum number of related tweets to show */
  maxRelated?: number;
}

/** Props for SearchBar component */
export interface SearchBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Search placeholder text */
  placeholder?: string;
  /** Search callback */
  onSearch?: (query: string) => void;
  /** Initial search value */
  initialValue?: string;
}

/** Props for BookGrid component */
export interface BookGridProps {
  /** Array of books to display */
  books: EnrichedBook[];
  /** Number of columns in grid */
  columns?: number;
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// SCRIPT & PROCESSING TYPES
// ============================================================================

/** Result from tweet enrichment process */
export interface EnrichmentResult {
  /** Processing success status */
  success: boolean;
  /** Number of tweets processed */
  processed: number;
  /** Number of errors encountered */
  errors: number;
  /** Error messages if any */
  errorMessages?: string[];
  /** Processing duration in milliseconds */
  duration: number;
}

/** Result from scraping process */
export interface ScrapingResult {
  /** Scraping success status */
  success: boolean;
  /** Thread ID that was scraped */
  threadId: string;
  /** Number of tweets scraped */
  tweetCount: number;
  /** Error message if failed */
  error?: string;
  /** Scraped tweets */
  tweets?: Tweet[];
}

/** Configuration for PDF generation */
export interface PDFGenerationConfig {
  /** Output file path */
  outputPath: string;
  /** Include images in PDF */
  includeImages: boolean;
  /** Page format */
  format: 'A4' | 'Letter' | 'Legal';
  /** Include table of contents */
  includeTOC: boolean;
  /** Filter by category */
  category?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  /** Response success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if unsuccessful */
  error?: string;
  /** Additional metadata */
  meta?: {
    /** Total count for paginated responses */
    total?: number;
    /** Current page */
    page?: number;
    /** Items per page */
    limit?: number;
  };
}

/** Search API response */
export interface SearchApiResponse extends ApiResponse<SearchIndexEntry[]> {
  /** Search query that was executed */
  query: string;
  /** Time taken for search in milliseconds */
  searchTime: number;
}

// ============================================================================
// EXTERNAL API TYPES
// ============================================================================

/** YouTube API video response */
export interface YouTubeVideoResponse {
  /** Video ID */
  id: string;
  /** Video title */
  title: string;
  /** Video description */
  description: string;
  /** Channel name */
  channelName: string;
  /** Thumbnail URL */
  thumbnail: string;
  /** Duration in seconds */
  duration: number;
  /** View count */
  viewCount: number;
  /** Publication date */
  publishedAt: string;
}

/** Goodreads API book response */
export interface GoodreadsBookResponse {
  /** Book ID */
  id: string;
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** Book description */
  description: string;
  /** Cover image URL */
  imageUrl: string;
  /** Average rating */
  averageRating: number;
  /** Number of ratings */
  ratingsCount: number;
  /** Publication year */
  publicationYear: number;
  /** ISBN */
  isbn: string;
  /** Number of pages */
  numPages: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Time formatting options */
export interface TimeFormatOptions {
  /** Use full text format (e.g., "2 días" vs "2d") */
  fullText?: boolean;
  /** Locale for formatting */
  locale?: string;
}

/** Category formatting options */
export interface CategoryFormatOptions {
  /** Convert to URL-safe format */
  urlSafe?: boolean;
  /** Capitalize first letter */
  capitalize?: boolean;
  /** Maximum length */
  maxLength?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/** Type guard to check if object is a Tweet */
export function isTweet(obj: unknown): obj is Tweet {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'tweet' in obj &&
    'time' in obj &&
    'author' in obj &&
    'stats' in obj
  );
}

/** Type guard to check if object is a TweetWithEngagement */
export function isTweetWithEngagement(obj: unknown): obj is TweetWithEngagement {
  return isTweet(obj) && 'engagement' in obj && typeof (obj as any).engagement === 'number';
}

/** Type guard to check if object is an Author */
export function isAuthor(obj: unknown): obj is Author {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'NAME' in obj &&
    'X' in obj &&
    'YOUTUBE' in obj &&
    typeof (obj as any).NAME === 'string' &&
    typeof (obj as any).X === 'string' &&
    typeof (obj as any).YOUTUBE === 'string'
  );
}

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

/** Supported enrichment types */
export const ENRICHMENT_TYPES = ['card', 'embed', 'media'] as const;
export type EnrichmentType = typeof ENRICHMENT_TYPES[number];

/** Supported category types */
export const CATEGORY_TYPES = [
  'desarrollo-software',
  'arquitectura',
  'management',
  'carrera-profesional',
  'tecnologia',
  'startup',
  'empresa',
  'formacion',
  'top-25-turras',
  'las-más-nuevas',
  'otros-autores'
] as const;
export type CategoryType = typeof CATEGORY_TYPES[number];

/** PDF format options */
export const PDF_FORMATS = ['A4', 'Letter', 'Legal'] as const;
export type PDFFormat = typeof PDF_FORMATS[number];