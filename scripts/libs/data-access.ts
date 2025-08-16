/**
 * Centralized data access layer for scripts
 * Eliminates duplicate JSON imports and provides type-safe data access
 */

import { join } from '@std/path';
import { readJsonFile, writeJsonFile, getDbPath } from './common-utils.ts';
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

  async getTweetsEnriched(): Promise<EnrichedTweetData[]> {
    return readJsonFile<EnrichedTweetData[]>(join(this.dbPath, 'tweets_enriched.json'));
  }

  async saveTweetsEnriched(enrichments: EnrichedTweetData[]): Promise<void> {
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

  async getTweetsExam(): Promise<TweetExam[]> {
    return readJsonFile<TweetExam[]>(join(this.dbPath, 'tweets_exam.json'));
  }

  async saveTweetsExam(exam: TweetExam[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets_exam.json'), exam);
  }

  async getTweetsDb(): Promise<SearchIndexEntry[]> {
    return readJsonFile<SearchIndexEntry[]>(join(this.dbPath, 'tweets-db.json'));
  }

  async saveTweetsDb(db: SearchIndexEntry[]): Promise<void> {
    await writeJsonFile(join(this.dbPath, 'tweets-db.json'), db);
  }

  async getTweetsPodcast(): Promise<PodcastEpisode[]> {
    return readJsonFile<PodcastEpisode[]>(join(this.dbPath, 'tweets_podcast.json'));
  }

  async saveTweetsPodcast(podcast: PodcastEpisode[]): Promise<void> {
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
    return await Deno.readTextFile(join(this.dbPath, 'turras.csv'));
  }

  async saveTurrasCsv(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'turras.csv'), content);
  }

  async getGlosarioCsv(): Promise<string> {
    return await Deno.readTextFile(join(this.dbPath, 'glosario.csv'));
  }

  async saveGlosarioCsv(content: string): Promise<void> {
    await Deno.writeTextFile(join(this.dbPath, 'glosario.csv'), content);
  }

  // Graph data access
  async getProcessedGraphData(): Promise<TurraNode[]> {
    return readJsonFile<TurraNode[]>(join(this.dbPath, 'processed_graph_data.json'));
  }

  async saveProcessedGraphData(data: TurraNode[]): Promise<void> {
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