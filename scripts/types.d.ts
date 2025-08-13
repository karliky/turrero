/**
 * TypeScript type definitions for the Turrero scripts layer
 * 
 * This file defines types used across various Node.js and Deno scripts
 * for data processing, scraping, and enrichment operations.
 */

// ============================================================================
// SCRAPING TYPES
// ============================================================================

/** Configuration for Puppeteer scraping */
export interface ScrapingConfig {
  /** Target thread ID to scrape */
  threadId: string;
  /** Maximum number of tweets to scrape */
  maxTweets?: number;
  /** Delay between requests in milliseconds */
  delay?: number;
  /** Whether to save images */
  saveImages?: boolean;
  /** Output directory for scraped data */
  outputDir?: string;
  /** User agent string for browser */
  userAgent?: string;
  /** Headless browser mode */
  headless?: boolean;
}

/** Result from tweet scraping operation */
export interface ScrapingResult {
  /** Operation success status */
  success: boolean;
  /** Thread ID that was scraped */
  threadId: string;
  /** Number of tweets successfully scraped */
  tweetCount: number;
  /** Error message if operation failed */
  error?: string;
  /** Array of scraped tweets */
  tweets?: ScrapedTweet[];
  /** Processing duration in milliseconds */
  duration: number;
  /** Timestamp when scraping started */
  startTime: string;
  /** Timestamp when scraping completed */
  endTime: string;
}

/** Individual scraped tweet data */
export interface ScrapedTweet {
  /** Unique tweet ID */
  id: string;
  /** Tweet text content */
  text: string;
  /** Author handle or profile URL */
  author: string;
  /** Tweet timestamp */
  timestamp: string;
  /** Engagement metrics */
  metrics: {
    views: string;
    likes: string;
    retweets: string;
    quotes: string;
    replies: string;
  };
  /** Attached media */
  media?: ScrapedMedia[];
  /** Quoted or embedded tweets */
  quotedTweet?: ScrapedTweet;
}

/** Scraped media attachment */
export interface ScrapedMedia {
  /** Media type */
  type: 'image' | 'video' | 'gif';
  /** Media URL */
  url: string;
  /** Local file path if downloaded */
  localPath?: string;
  /** Alt text if available */
  altText?: string;
  /** Media dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
}

// ============================================================================
// ENRICHMENT TYPES
// ============================================================================

/** Configuration for tweet enrichment process */
export interface EnrichmentConfig {
  /** Input tweets file path */
  inputFile: string;
  /** Output enriched file path */
  outputFile: string;
  /** APIs to use for enrichment */
  enabledApis: {
    youtube?: boolean;
    goodreads?: boolean;
    amazon?: boolean;
    github?: boolean;
  };
  /** Rate limiting configuration */
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  /** Retry configuration */
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
}

/** Result from enrichment process */
export interface EnrichmentResult {
  /** Processing success status */
  success: boolean;
  /** Number of tweets processed */
  processed: number;
  /** Number of tweets enriched */
  enriched: number;
  /** Number of errors encountered */
  errors: number;
  /** Detailed error messages */
  errorMessages: string[];
  /** Processing duration in milliseconds */
  duration: number;
  /** Enrichment statistics by type */
  stats: {
    youtube: number;
    goodreads: number;
    amazon: number;
    github: number;
    images: number;
  };
}

/** Individual enrichment result */
export interface TweetEnrichmentResult {
  /** Source tweet ID */
  tweetId: string;
  /** Enrichment type applied */
  type: 'youtube' | 'goodreads' | 'amazon' | 'github' | 'image' | 'embed';
  /** Enrichment data */
  data: EnrichmentData;
  /** Processing success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/** Union type for enrichment data */
export type EnrichmentData = 
  | YouTubeEnrichment 
  | GoodreadsEnrichment 
  | AmazonEnrichment 
  | GitHubEnrichment 
  | ImageEnrichment 
  | EmbedEnrichment;

/** YouTube video enrichment data */
export interface YouTubeEnrichment {
  type: 'youtube';
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  thumbnail: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
}

/** Goodreads book enrichment data */
export interface GoodreadsEnrichment {
  type: 'goodreads';
  bookId: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  rating: number;
  ratingsCount: number;
  publicationYear: number;
  isbn: string;
  pages: number;
}

/** Amazon product enrichment data */
export interface AmazonEnrichment {
  type: 'amazon';
  asin: string;
  title: string;
  description: string;
  price: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  category: string;
}

/** GitHub repository enrichment data */
export interface GitHubEnrichment {
  type: 'github';
  repoName: string;
  owner: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  issues: number;
  lastUpdated: string;
  license: string;
}

/** Image enrichment data */
export interface ImageEnrichment {
  type: 'image';
  url: string;
  localPath: string;
  altText?: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
  format: string;
}

/** Embedded content enrichment data */
export interface EmbedEnrichment {
  type: 'embed';
  embeddedTweetId: string;
  author: string;
  content: string;
  timestamp: string;
}

// ============================================================================
// PDF GENERATION TYPES
// ============================================================================

/** Configuration for PDF generation */
export interface PDFConfig {
  /** Input data source */
  input: {
    /** Source file path */
    file: string;
    /** Data format */
    format: 'json' | 'csv';
    /** Filter criteria */
    filters?: {
      category?: string;
      author?: string;
      dateRange?: {
        start: string;
        end: string;
      };
    };
  };
  /** Output configuration */
  output: {
    /** Output file path */
    file: string;
    /** PDF format */
    format: 'A4' | 'Letter' | 'Legal';
    /** Include table of contents */
    includeTOC: boolean;
    /** Include images */
    includeImages: boolean;
    /** Page margins */
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  /** Styling configuration */
  style: {
    /** Font family */
    fontFamily: string;
    /** Base font size */
    fontSize: number;
    /** Line height */
    lineHeight: number;
    /** Color scheme */
    colors: {
      primary: string;
      secondary: string;
      text: string;
      background: string;
    };
  };
}

/** PDF generation result */
export interface PDFResult {
  /** Generation success status */
  success: boolean;
  /** Output file path */
  outputFile: string;
  /** File size in bytes */
  fileSize: number;
  /** Number of pages generated */
  pageCount: number;
  /** Number of tweets included */
  tweetCount: number;
  /** Generation duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// BOOK PROCESSING TYPES
// ============================================================================

/** Book reference found in tweets */
export interface BookReference {
  /** Source tweet ID */
  tweetId: string;
  /** Book title */
  title: string;
  /** Book author */
  author: string;
  /** Context where book was mentioned */
  context: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Extraction method used */
  extractionMethod: 'regex' | 'nlp' | 'manual';
}

/** Enriched book data */
export interface EnrichedBook extends BookReference {
  /** ISBN number */
  isbn?: string;
  /** Book description */
  description?: string;
  /** Cover image URL */
  coverImage?: string;
  /** Publication year */
  year?: number;
  /** Publisher */
  publisher?: string;
  /** Average rating */
  rating?: number;
  /** Number of ratings */
  ratingCount?: number;
  /** Page count */
  pages?: number;
  /** Amazon URL */
  amazonUrl?: string;
  /** Goodreads URL */
  goodreadsUrl?: string;
  /** Category classification */
  category?: string;
}

/** Book processing result */
export interface BookProcessingResult {
  /** Processing success status */
  success: boolean;
  /** Number of books found */
  booksFound: number;
  /** Number of books enriched */
  booksEnriched: number;
  /** Number of errors */
  errors: number;
  /** Processing duration in milliseconds */
  duration: number;
  /** List of processed books */
  books: EnrichedBook[];
  /** Error messages */
  errorMessages: string[];
}

// ============================================================================
// ALGOLIA SEARCH TYPES
// ============================================================================

/** Algolia index configuration */
export interface AlgoliaConfig {
  /** Application ID */
  appId: string;
  /** API key */
  apiKey: string;
  /** Index name */
  indexName: string;
  /** Index settings */
  settings: {
    /** Searchable attributes */
    searchableAttributes: string[];
    /** Attributes for faceting */
    attributesForFaceting: string[];
    /** Custom ranking */
    customRanking: string[];
    /** Ranking criteria */
    ranking: string[];
  };
}

/** Search index entry */
export interface SearchIndexEntry {
  /** Unique object ID */
  objectID: string;
  /** Tweet content */
  content: string;
  /** Thread summary */
  summary: string;
  /** Author information */
  author: string;
  /** Categories */
  categories: string[];
  /** Publication timestamp */
  timestamp: number;
  /** Engagement score */
  engagement: number;
  /** Has exam */
  hasExam: boolean;
  /** Has podcast */
  hasPodcast: boolean;
}

/** Algolia indexing result */
export interface AlgoliaIndexingResult {
  /** Indexing success status */
  success: boolean;
  /** Number of objects indexed */
  objectsIndexed: number;
  /** Number of errors */
  errors: number;
  /** Indexing duration in milliseconds */
  duration: number;
  /** Task IDs from Algolia */
  taskIDs: number[];
  /** Error messages */
  errorMessages: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** File processing result */
export interface FileProcessingResult {
  /** Processing success status */
  success: boolean;
  /** Input file path */
  inputFile: string;
  /** Output file path */
  outputFile: string;
  /** Number of records processed */
  recordsProcessed: number;
  /** Processing duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
}

/** Environment configuration */
export interface EnvironmentConfig {
  /** Node.js version requirement */
  nodeVersion: string;
  /** Deno version requirement */
  denoVersion?: string;
  /** Required environment variables */
  requiredEnvVars: string[];
  /** Optional environment variables */
  optionalEnvVars: string[];
  /** External dependencies */
  dependencies: {
    /** NPM packages */
    npm: string[];
    /** Deno modules */
    deno: string[];
    /** System binaries */
    system: string[];
  };
}

/** Script execution context */
export interface ExecutionContext {
  /** Script name */
  scriptName: string;
  /** Working directory */
  workingDir: string;
  /** Runtime environment */
  runtime: 'node' | 'deno' | 'python';
  /** Command line arguments */
  args: string[];
  /** Environment variables */
  env: Record<string, string>;
  /** Start timestamp */
  startTime: string;
}

/** Progress callback type */
export type ProgressCallback = (progress: {
  /** Current step */
  step: number;
  /** Total steps */
  total: number;
  /** Step description */
  description: string;
  /** Percentage complete (0-100) */
  percentage: number;
}) => void;

/** Logger interface */
export interface Logger {
  /** Log info message */
  info(message: string, ...args: any[]): void;
  /** Log warning message */
  warn(message: string, ...args: any[]): void;
  /** Log error message */
  error(message: string, ...args: any[]): void;
  /** Log debug message */
  debug(message: string, ...args: any[]): void;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/** Custom error for scraping operations */
export class ScrapingError extends Error {
  constructor(
    message: string,
    public threadId: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

/** Custom error for enrichment operations */
export class EnrichmentError extends Error {
  constructor(
    message: string,
    public tweetId: string,
    public enrichmentType: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'EnrichmentError';
  }
}

/** Custom error for file processing operations */
export class FileProcessingError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/** Data validation result */
export interface ValidationResult {
  /** Validation success status */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  /** Error field or property */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Actual value that failed validation */
  value: any;
}

/** Validation warning */
export interface ValidationWarning {
  /** Warning field or property */
  field: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
  /** Value that triggered warning */
  value: any;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Supported enrichment types */
export const ENRICHMENT_TYPES = [
  'youtube',
  'goodreads', 
  'amazon',
  'github',
  'image',
  'embed'
] as const;

/** Supported file formats */
export const FILE_FORMATS = ['json', 'csv', 'txt', 'md'] as const;

/** Supported runtime environments */
export const RUNTIME_ENVIRONMENTS = ['node', 'deno', 'python'] as const;