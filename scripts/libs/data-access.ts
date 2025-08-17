/**
 * Centralized data access layer for scripts
 * Eliminates duplicate JSON imports and provides type-safe data access
 */

import { join } from '@std/path';
import { readJsonFile as _readJsonFile, writeJsonFile as _writeJsonFile, getDbPath } from './common-utils.ts';
import type {
  Tweet,
  EnrichedTweetData,
  CategorizedTweet as _CategorizedTweet,
  TweetSummary as _TweetSummary,
  TweetExam as _TweetExam,
  BookToEnrich,
  CurrentBook,
  SearchIndexEntry as _SearchIndexEntry,
  PodcastEpisode as _PodcastEpisode,
  TurraNode as _TurraNode
} from '../../infrastructure/types/index.ts';

// ============================================================================
// DATA ACCESS LAYER
// ============================================================================

export class DataAccess {
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  // JSON data access (Deno compatible)
  async getTweets(): Promise<Tweet[][]> {
    const content = await Deno.readTextFile(join(this.dbPath, 'tweets.json'));
    return JSON.parse(content);
  }

  async saveTweets(tweets: Tweet[][]): Promise<void> {
    const content = JSON.stringify(tweets, null, 4);
    await Deno.writeTextFile(join(this.dbPath, 'tweets.json'), content);
  }

  async getTweetsEnriched(): Promise<EnrichedTweetData[]> {
    const content = await Deno.readTextFile(join(this.dbPath, 'tweets_enriched.json'));
    return JSON.parse(content);
  }

  async saveTweetsEnriched(enrichedTweets: EnrichedTweetData[]): Promise<void> {
    const content = JSON.stringify(enrichedTweets, null, 4);
    await Deno.writeTextFile(join(this.dbPath, 'tweets_enriched.json'), content);
  }

  async getTweetsMap(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'tweets_map.json'));
  }

  async saveTweetsMap(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'tweets_map.json'), content);
  }

  async getTweetsSummary(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'tweets_summary.json'));
  }

  async saveTweetsSummary(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'tweets_summary.json'), content);
  }

  async getTweetsExam(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'tweets_exam.json'));
  }

  async saveTweetsExam(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'tweets_exam.json'), content);
  }

  async getBooks(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'books.json'));
  }

  async saveBooks(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'books.json'), content);
  }

  async getBooksNotEnriched(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'books-not-enriched.json'));
  }

  async saveBooksNotEnriched(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'books-not-enriched.json'), content);
  }

  async getTweetsDb(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'tweets-db.json'));
  }

  async saveTweetsDb(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'tweets-db.json'), content);
  }

  async getGlosarioCsv(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'glosario.csv'));
  }

  async saveGlosarioCsv(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'glosario.csv'), content);
  }

  // Helper method to check if a file exists
  async fileExists(filename: string): Promise<boolean> {
    try {
      await Deno.stat(join(this.dbPath, filename));
      return true;
    } catch {
      return false;
    }
  }

  // Helper method to create backup of a file
  async createBackup(filename: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${filename}.backup.${timestamp}`;
    const originalPath = join(this.dbPath, filename);
    const backupPath = join(this.dbPath, backupName);
    
    await Deno.copyFile(originalPath, backupPath);
    return backupName;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a data access instance for a script
 */
export function createDataAccess(scriptDir: string): DataAccess {
  return new DataAccess(getDbPath(scriptDir));
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON DATA OPERATIONS
// ============================================================================

/**
 * Gets books that need enrichment (exist in books.json but lack categories)
 */
export async function getBooksToEnrich(dataAccess: DataAccess): Promise<BookToEnrich[]> {
  const [booksNotEnrichedStr, currentBooksStr] = await Promise.all([
    dataAccess.getBooksNotEnriched(),
    dataAccess.getBooks()
  ]);

  const booksNotEnriched: BookToEnrich[] = JSON.parse(booksNotEnrichedStr);
  const currentBooks: CurrentBook[] = JSON.parse(currentBooksStr);

  return booksNotEnriched.filter((book: BookToEnrich) => {
    const currentBook = currentBooks.find((cb: CurrentBook) => cb.id === book.id);
    return currentBook && (!('categories' in currentBook) || (currentBook.categories && currentBook.categories.length === 0));
  });
}

/**
 * Gets books from GoodReads enrichments
 */
export async function getBooksFromGoodReads(dataAccess: DataAccess): Promise<EnrichedTweetData[]> {
  const [enrichments, tweets] = await Promise.all([
    dataAccess.getTweetsEnriched(),
    dataAccess.getTweets()
  ]);

  return enrichments
    .filter((e: EnrichedTweetData) => e.media === 'goodreads')
    .map((book: EnrichedTweetData) => {
      const tweet = tweets.find((t: Tweet[]) => t.find((tt: Tweet) => tt.id === book.id))?.[0];
      return { ...book, turraId: tweet?.id || "" };
    })
    .filter((book: EnrichedTweetData & { turraId: string }) => book.url && book.url.indexOf('/author/') === -1);
}

/**
 * Merges current books with enriched books
 */
export function mergeEnrichedBooks(currentBooks: CurrentBook[], enrichedBooks: BookToEnrich[]): CurrentBook[] {
  return currentBooks.map((currentBook: CurrentBook) => {
    const enrichedBook = enrichedBooks.find((book: BookToEnrich) => book.id === currentBook.id);
    return enrichedBook ? enrichedBook : currentBook;
  });
}