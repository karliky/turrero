/**
 * Centralized configuration for scripts
 * Eliminates hardcoded values and provides consistent defaults
 */

export interface ScriptConfig {
  // Database paths
  readonly dbDirectory: string;
  readonly metadataDirectory: string;
  
  // Browser configuration
  readonly browser: {
    readonly slowMo: number;
    readonly headless: boolean;
    readonly devtools: boolean;
  };
  
  // Network configuration
  readonly network: {
    readonly tlsRejectUnauthorized: boolean;
    readonly requestTimeout: number;
    readonly retryAttempts: number;
  };
  
  // Rate limiting
  readonly rateLimits: {
    readonly wikipediaDelay: number;
    readonly defaultDelay: number;
  };
  
  // File processing
  readonly files: {
    readonly encoding: BufferEncoding;
    readonly jsonIndentation: number;
  };
}

/**
 * Default configuration for all scripts
 */
export const DEFAULT_SCRIPT_CONFIG: ScriptConfig = {
  dbDirectory: '../infrastructure/db',
  metadataDirectory: './metadata',
  
  browser: {
    slowMo: 200,
    headless: true,
    devtools: false,
  },
  
  network: {
    tlsRejectUnauthorized: false,
    requestTimeout: 30000,
    retryAttempts: 3,
  },
  
  rateLimits: {
    wikipediaDelay: 1000,
    defaultDelay: 100,
  },
  
  files: {
    encoding: 'utf8',
    jsonIndentation: 4,
  },
} as const;

/**
 * Configuration for development environment
 */
export const DEV_SCRIPT_CONFIG: Partial<ScriptConfig> = {
  browser: {
    slowMo: 100,
    headless: false,
    devtools: true,
  },
} as const;

/**
 * Configuration for production environment
 */
export const PROD_SCRIPT_CONFIG: Partial<ScriptConfig> = {
  browser: {
    slowMo: 10,
    headless: true,
    devtools: false,
  },
  
  rateLimits: {
    wikipediaDelay: 2000,
    defaultDelay: 500,
  },
} as const;

/**
 * Gets configuration based on environment
 */
export function getScriptConfig(): ScriptConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let envConfig: Partial<ScriptConfig> = {};
  
  if (isProduction) {
    envConfig = PROD_SCRIPT_CONFIG;
  } else if (isDevelopment) {
    envConfig = DEV_SCRIPT_CONFIG;
  }
  
  return {
    ...DEFAULT_SCRIPT_CONFIG,
    ...envConfig,
    // Allow for deep merging of nested objects
    browser: {
      ...DEFAULT_SCRIPT_CONFIG.browser,
      ...(envConfig.browser || {}),
    },
    network: {
      ...DEFAULT_SCRIPT_CONFIG.network,
      ...(envConfig.network || {}),
    },
    rateLimits: {
      ...DEFAULT_SCRIPT_CONFIG.rateLimits,
      ...(envConfig.rateLimits || {}),
    },
    files: {
      ...DEFAULT_SCRIPT_CONFIG.files,
      ...(envConfig.files || {}),
    },
  };
}

/**
 * Database file names enum to centralize file references
 */
export enum DatabaseFiles {
  TWEETS = 'tweets.json',
  TWEETS_ENRICHED = 'tweets_enriched.json',
  TWEETS_MAP = 'tweets_map.json',
  TWEETS_SUMMARY = 'tweets_summary.json',
  TWEETS_EXAM = 'tweets_exam.json',
  TWEETS_DB = 'tweets-db.json',
  TWEETS_PODCAST = 'tweets_podcast.json',
  BOOKS = 'books.json',
  BOOKS_NOT_ENRICHED = 'books-not-enriched.json',
  TURRAS_CSV = 'turras.csv',
  GLOSARIO_CSV = 'glosario.csv',
  PROCESSED_GRAPH_DATA = 'processed_graph_data.json',
}

/**
 * Script names enum for consistent logging prefixes
 */
export enum ScriptNames {
  ADD_TWEET = 'add-tweet',
  TWEETS_ENRICHMENT = 'tweets-enrichment',
  BOOK_ENRICHMENT = 'book-enrichment',
  GENERATE_BOOKS = 'generate-books',
  MAKE_ALGOLIA_DB = 'make-algolia-db',
  GENERATE_PDF = 'generate-pdf',
  RECORDER = 'recorder',
  VALIDATE_TYPES = 'validate-types',
}

/**
 * Common file extensions used in the project
 */
export enum FileExtensions {
  JSON = '.json',
  CSV = '.csv',
  TS = '.ts',
  JS = '.js',
  PNG = '.png',
  JPG = '.jpg',
  PDF = '.pdf',
}

/**
 * Media types for enrichment processing
 */
export enum MediaTypes {
  YOUTUBE = 'youtube',
  GOODREADS = 'goodreads',
  WIKIPEDIA = 'wikipedia',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  IMAGE = 'image',
  CARD = 'card',
}