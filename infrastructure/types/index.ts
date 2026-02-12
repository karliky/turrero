/**
 * Consolidated TypeScript type definitions for the Turrero project
 * 
 * This file centralizes all type definitions used across the application,
 * including data structures, API responses, and component props.
 */

// ID TYPES AND UTILITIES
// ============================================================================

/** Standard thread ID format */
export type ThreadId = string;

/** Standard tweet ID format */
export type TweetId = string;

/** Composite ID format: threadId#tweetId */
export type CompositeId = string;

// Re-export ID utilities for convenience
export * from '../utils/id-utils';

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
  id: TweetId;
  author: string;
  tweet: string;
  url?: string;
  img?: string;
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
  id: TweetId;
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
  id: ThreadId;
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
  /** Thread ID */
  id: ThreadId;
  /** Comma-separated category names */
  categories: string;
}

/** Tweet summary for display purposes */
export interface TweetSummary {
  /** Thread ID */
  id: ThreadId;
  /** Human-readable summary */
  summary: string;
}

/** Enriched tweet metadata for enhanced display */
export interface EnrichedTweetMetadata {
  /** Tweet ID */
  id: TweetId;
  /** Type of enrichment */
  type: 'card' | 'embed' | 'media' | 'image';
  /** Image URL for cards/media */
  img?: string;
  /** External URL for cards */
  url?: string;
  /** Media file path */
  media?: string;
  /** Card domain (e.g., goodreads.com, youtube.com) */
  domain?: string;
  /** Card description */
  description?: string;
  /** Card title */
  title?: string;
  /** Embedded tweet ID */
  embeddedTweetId?: TweetId;
  /** Embedded tweet author */
  author?: string;
  /** Embedded tweet content */
  tweet?: string;
}

/** Enriched tweet data structure as stored in tweets_enriched.json */
export interface EnrichedTweetData {
  /** Tweet ID */
  id: TweetId;
  /** Type of enrichment */
  type: string;
  /** Image URL for cards/media */
  img?: string;
  /** External URL for cards */
  url?: string;
  /** Media source (youtube, goodreads, etc) */
  media?: string;
  /** Card domain (e.g., goodreads.com, youtube.com) */
  domain?: string;
  /** Card description */
  description?: string;
  /** Card title */
  title?: string;
  /** Embedded tweet ID (for type "embed") */
  embeddedTweetId?: TweetId;
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
  /** Source thread ID */
  id: ThreadId;
  /** Array of quiz questions */
  questions: QuizQuestion[];
}

// ============================================================================
// GRAPH & ANALYTICS TYPES
// ============================================================================

/** Graph node representing a tweet thread */
export interface TurraNode {
  /** Tweet thread ID */
  id: ThreadId;
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
  /** Source thread ID */
  id: ThreadId;
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
  objectID: CompositeId;
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
  /** Current thread ID */
  currentTweetId: ThreadId;
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
  return isTweet(obj) && 'engagement' in obj && typeof (obj as Record<string, unknown>).engagement === 'number';
}

/** Type guard to check if object is an Author */
export function isAuthor(obj: unknown): obj is Author {
  const record = obj as Record<string, unknown>;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'NAME' in obj &&
    'X' in obj &&
    'YOUTUBE' in obj &&
    typeof record.NAME === 'string' &&
    typeof record.X === 'string' &&
    typeof record.YOUTUBE === 'string'
  );
}

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

/** Supported enrichment types */
export enum EnrichmentType {
  CARD = 'card',
  EMBED = 'embed',
  MEDIA = 'media'
}

/** Supported category types */
export enum CategoryType {
  DESARROLLO_SOFTWARE = 'desarrollo-software',
  ARQUITECTURA = 'arquitectura',
  MANAGEMENT = 'management',
  CARRERA_PROFESIONAL = 'carrera-profesional',
  TECNOLOGIA = 'tecnologia',
  STARTUP = 'startup',
  EMPRESA = 'empresa',
  FORMACION = 'formacion',
  TOP_25_TURRAS = 'top-25-turras',
  LAS_MAS_NUEVAS = 'las-más-nuevas',
  OTROS_AUTORES = 'otros-autores'
}

/** Processing states for scripts */
export enum ProcessingState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  SKIPPED = 'skipped'
}

/** Tweet metadata types */
export enum TweetMetadataType {
  CARD = 'card',
  EMBED = 'embed',
  IMAGE = 'image',
  VIDEO = 'video',
  LINK = 'link',
  QUOTE = 'quote'
}

/** Media file formats */
export enum MediaFormat {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  GIF = 'gif',
  WEBP = 'webp',
  MP4 = 'mp4',
  WEBM = 'webm'
}

/** PDF format options */
export enum PDFFormat {
  A4 = 'A4',
  LETTER = 'Letter',
  LEGAL = 'Legal'
}

/** Script execution modes */
export enum ScriptMode {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
  DEBUG = 'debug'
}

/** Log levels for scripts */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/** Book enrichment status */
export enum BookEnrichmentStatus {
  NOT_ENRICHED = 'not_enriched',
  ENRICHING = 'enriching',
  ENRICHED = 'enriched',
  FAILED = 'failed'
}

/** Scraping status */
export enum ScrapingStatus {
  QUEUED = 'queued',
  SCRAPING = 'scraping',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RATE_LIMITED = 'rate_limited'
}

// Legacy constants for backward compatibility
export const ENRICHMENT_TYPES = [
  EnrichmentType.CARD,
  EnrichmentType.EMBED,
  EnrichmentType.MEDIA
] as const;

export const CATEGORY_TYPES = [
  CategoryType.DESARROLLO_SOFTWARE,
  CategoryType.ARQUITECTURA,
  CategoryType.MANAGEMENT,
  CategoryType.CARRERA_PROFESIONAL,
  CategoryType.TECNOLOGIA,
  CategoryType.STARTUP,
  CategoryType.EMPRESA,
  CategoryType.FORMACION,
  CategoryType.TOP_25_TURRAS,
  CategoryType.LAS_MAS_NUEVAS,
  CategoryType.OTROS_AUTORES
] as const;

export const PDF_FORMATS = [
  PDFFormat.A4,
  PDFFormat.LETTER,
  PDFFormat.LEGAL
] as const;

// ============================================================================
// SPECIFIC SCRIPT TYPES (replacing any)
// ============================================================================

/** jQuery element type for cheerio operations */
export interface CheerioElement {
  text(): string;
  html(): string | null;
  attr(name: string): string | undefined;
  find(selector: string): CheerioElement[];
  [key: string]: unknown;
}

/** Scraped metadata for tweet enrichment */
export interface ScrapedMetadata {
  type: TweetMetadataType;
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  [key: string]: unknown;
}

/** Book to enrich interface */
export interface BookToEnrich {
  id: TweetId;
  title: string;
  author: string;
  description?: string;
  url?: string;
  image?: string;
  sourceThreadId?: string;
  turraId?: string;
  categories?: string[];
  goodreadsCategories?: string[];
}

/** Current book with potential enrichment data */
export interface CurrentBook extends BookToEnrich {
  isbn?: string;
  year?: number;
  publisher?: string;
  rating?: number;
  pages?: number;
  enrichmentStatus?: BookEnrichmentStatus;
}

/** Image metadata for downloading */
export interface ImageMetadata {
  img: string;
  url: string;
  filename?: string;
  path?: string;
}

/** Error with context information */
export interface ContextualError extends Error {
  context?: {
    tweetId?: string;
    url?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
  };
}

/** JSON file content type */
export type JsonContent = 
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

/** Logger interface for scripts */
export interface ScriptLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  fatal(message: string, ...args: unknown[]): void;
}

/** Console interface for type safety */
export interface TypedConsole {
  log(message?: unknown, ...optionalParams: unknown[]): void;
  error(message?: unknown, ...optionalParams: unknown[]): void;
  warn(message?: unknown, ...optionalParams: unknown[]): void;
  info(message?: unknown, ...optionalParams: unknown[]): void;
  debug(message?: unknown, ...optionalParams: unknown[]): void;
  trace(message?: unknown, ...optionalParams: unknown[]): void;
}

/** File system path operations */
export interface PathOperations {
  join(...paths: string[]): string;
  resolve(...pathSegments: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
}

/** Environment variables interface */
export interface ScriptEnvironment {
  NODE_ENV?: string;
  DENO_ENV?: string;
  DEBUG?: string;
  [key: string]: string | undefined;
}