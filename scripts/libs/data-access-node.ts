/**
 * Centralized data access layer for Node.js scripts
 * Node.js compatible version of data-access.ts
 */

import { join } from 'node:path';
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { readJsonFile, writeJsonFile, getDbPath } from './common-utils-node.ts';
import type {
  Tweet,
  EnrichedTweetData,
  CategorizedTweet,
  TweetSummary,
  TweetExam,
  BookToEnrich,
  CurrentBook,
  SearchIndexEntry,
  PodcastEpisode,
  TurraNode
} from '../../infrastructure/types/index.ts';

// ============================================================================
// DATA ACCESS LAYER
// ============================================================================

export class DataAccess {
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  // JSON data access (Node.js compatible)
  async getTweets(): Promise<string> {
    return await readFile(join(this.dbPath, 'tweets.json'), 'utf-8');
  }

  async saveTweets(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'tweets.json'), content, 'utf-8');
  }

  async getTweetsEnriched(): Promise<string> {
    return await readFile(join(this.dbPath, 'tweets_enriched.json'), 'utf-8');
  }

  async saveTweetsEnriched(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'tweets_enriched.json'), content, 'utf-8');
  }

  async getTweetsMap(): Promise<string> {
    return await readFile(join(this.dbPath, 'tweets_map.json'), 'utf-8');
  }

  async saveTweetsMap(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'tweets_map.json'), content, 'utf-8');
  }

  async getTweetsSummary(): Promise<string> {
    return await readFile(join(this.dbPath, 'tweets_summary.json'), 'utf-8');
  }

  async saveTweetsSummary(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'tweets_summary.json'), content, 'utf-8');
  }

  async getTweetsExam(): Promise<string> {
    return await readFile(join(this.dbPath, 'tweets_exam.json'), 'utf-8');
  }

  async saveTweetsExam(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'tweets_exam.json'), content, 'utf-8');
  }

  async getBooks(): Promise<string> {
    return await readFile(join(this.dbPath, 'books.json'), 'utf-8');
  }

  async saveBooks(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'books.json'), content, 'utf-8');
  }

  async getBooksNotEnriched(): Promise<string> {
    return await readFile(join(this.dbPath, 'books-not-enriched.json'), 'utf-8');
  }

  async saveBooksNotEnriched(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'books-not-enriched.json'), content, 'utf-8');
  }

  async getTweetsDb(): Promise<string> {
    return await readFile(join(this.dbPath, 'tweets-db.json'), 'utf-8');
  }

  async saveTweetsDb(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'tweets-db.json'), content, 'utf-8');
  }

  async getGlosarioCsv(): Promise<string> {
    return await readFile(join(this.dbPath, 'glosario.csv'), 'utf-8');
  }

  async saveGlosarioCsv(content: string): Promise<void> {
    await writeFile(join(this.dbPath, 'glosario.csv'), content, 'utf-8');
  }

  // Helper method to check if a file exists
  async fileExists(filename: string): Promise<boolean> {
    try {
      await access(join(this.dbPath, filename));
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
    
    await copyFile(originalPath, backupPath);
    return backupName;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a data access instance for a Node.js script
 */
export function createDataAccess(scriptDir: string): DataAccess {
  return new DataAccess(scriptDir);
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON DATA OPERATIONS
// ============================================================================

/**
 * Gets books that need enrichment (exist in books.json but lack categories)
 */
export async function getBooksToEnrich(dataAccess: DataAccess): Promise<BookToEnrich[]> {
  const [booksNotEnriched, currentBooks] = await Promise.all([
    dataAccess.getBooksNotEnriched(),
    dataAccess.getBooks()
  ]);

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