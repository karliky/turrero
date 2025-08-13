/**
 * Centralized data access layer for scripts
 * Eliminates duplicate JSON imports and provides type-safe data access
 */

import { join } from 'node:path';
import { readJsonFile, writeJsonFile, getDbPath } from './common-utils.js';
import type {
  Tweet,
  EnrichmentResult,
  CategorizedTweet,
  TweetSummary,
  ExamQuestion,
  EnrichedBook,
  BookToEnrich,
  CurrentBook
} from '../../infrastructure/types/index.js';

// ============================================================================
// DATA ACCESS LAYER
// ============================================================================

export class DataAccess {
  private dbPath: string;

  constructor(scriptDir: string) {
    this.dbPath = getDbPath(scriptDir);
  }

  // Tweet-related data access
  async getTweets(): Promise<Tweet[][]> {
    return readJsonFile<Tweet[][]>(join(this.dbPath, 'tweets.json'));
  }

  async saveTweets(tweets: Tweet[][]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets.json'), tweets);
  }

  async getTweetsEnriched(): Promise<EnrichmentResult[]> {
    return readJsonFile<EnrichmentResult[]>(join(this.dbPath, 'tweets_enriched.json'));
  }

  async saveTweetsEnriched(enrichments: EnrichmentResult[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets_enriched.json'), enrichments);
  }

  async getTweetsMap(): Promise<CategorizedTweet[]> {
    return readJsonFile<CategorizedTweet[]>(join(this.dbPath, 'tweets_map.json'));
  }

  async saveTweetsMap(map: CategorizedTweet[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets_map.json'), map);
  }

  async getTweetsSummary(): Promise<TweetSummary[]> {
    return readJsonFile<TweetSummary[]>(join(this.dbPath, 'tweets_summary.json'));
  }

  async saveTweetsSummary(summaries: TweetSummary[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets_summary.json'), summaries);
  }

  async getTweetsExam(): Promise<ExamQuestion[]> {
    return readJsonFile<ExamQuestion[]>(join(this.dbPath, 'tweets_exam.json'));
  }

  async saveTweetsExam(exam: ExamQuestion[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets_exam.json'), exam);
  }

  async getTweetsDb(): Promise<any[]> {
    return readJsonFile<any[]>(join(this.dbPath, 'tweets-db.json'));
  }

  async saveTweetsDb(db: any[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets-db.json'), db);
  }

  async getTweetsPodcast(): Promise<any[]> {
    return readJsonFile<any[]>(join(this.dbPath, 'tweets_podcast.json'));
  }

  async saveTweetsPodcast(podcast: any[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets_podcast.json'), podcast);
  }

  // Book-related data access
  async getBooks(): Promise<CurrentBook[]> {
    return readJsonFile<CurrentBook[]>(join(this.dbPath, 'books.json'));
  }

  async saveBooks(books: CurrentBook[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'books.json'), books);
  }

  async getBooksNotEnriched(): Promise<BookToEnrich[]> {
    return readJsonFile<BookToEnrich[]>(join(this.dbPath, 'books-not-enriched.json'));
  }

  async saveBooksNotEnriched(books: BookToEnrich[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'books-not-enriched.json'), books);
  }

  // CSV data access
  async getTurrasCsv(): Promise<string> {
    const fs = await import('node:fs/promises');
    return fs.readFile(join(this.dbPath, 'turras.csv'), 'utf8');
  }

  async saveTurrasCsv(content: string): Promise<void> {
    const fs = await import('node:fs/promises');
    await fs.writeFile(join(this.dbPath, 'turras.csv'), content, 'utf8');
  }

  async getGlosarioCsv(): Promise<string> {
    const fs = await import('node:fs/promises');
    return fs.readFile(join(this.dbPath, 'glosario.csv'), 'utf8');
  }

  async saveGlosarioCsv(content: string): Promise<void> {
    const fs = await import('node:fs/promises');
    await fs.writeFile(join(this.dbPath, 'glosario.csv'), content, 'utf8');
  }

  // Graph data access
  async getProcessedGraphData(): Promise<any> {
    return readJsonFile(join(this.dbPath, 'processed_graph_data.json'));
  }

  async saveProcessedGraphData(data: any): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'processed_graph_data.json'), data);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a data access instance for a script
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
export async function getBooksFromGoodReads(dataAccess: DataAccess): Promise<EnrichmentResult[]> {
  const [enrichments, tweets] = await Promise.all([
    dataAccess.getTweetsEnriched(),
    dataAccess.getTweets()
  ]);

  return enrichments
    .filter((e: EnrichmentResult) => e.media === 'goodreads')
    .map((book: EnrichmentResult) => {
      const tweet = tweets.find((t: Tweet[]) => t.find((tt: Tweet) => tt.id === book.id))?.[0];
      return { ...book, turraId: tweet?.id || "" };
    })
    .filter((book: any) => book.url.indexOf('/author/') === -1);
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