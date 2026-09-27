// Adding and refreshing turras: X API -> canonical database (+ AI enrichment).
import { rebuildSearch, transaction, type Db } from './db';
import { listCategories, getThread } from './queries';
import { insertThread, replaceTweets, setThreadCategories, updateThreadEnrichment, upsertAuthor, upsertBook } from './store';
import { tweetIdFromInput } from './text';
import { XApiError, type XClient } from './x';
import type { Enricher } from './ai';
import { createImageStore, type ImageStore } from './images';

const PROVISIONAL_TITLE_LENGTH = 90;

export interface IngestResult {
  threadId: string;
  tweets: number;
  enriched: boolean;
  warnings: string[];
}

function threadIdOfTweet(db: Db, tweetId: string): string | null {
  const row = db.prepare('SELECT thread_id FROM tweets WHERE id = ?').get(tweetId) as { thread_id: string } | undefined;
  return row?.thread_id ?? null;
}

/** Imports a turra from its URL (or the id of any of its tweets), then enriches it with AI when possible. */
export async function addTurra(
  db: Db,
  input: string,
  x: XClient,
  enrich: Enricher | null,
  storeImages: ImageStore = createImageStore(),
): Promise<IngestResult> {
  const tweetId = tweetIdFromInput(input);
  const existing = threadIdOfTweet(db, tweetId);
  if (existing) throw new Error(`The turra ${existing} is already in the database (use turra:sync to refresh it)`);

  const fetched = await x.fetchThread(tweetId);
  const root = fetched.tweets[0]!;
  if (threadIdOfTweet(db, root.id)) throw new Error(`The turra ${root.id} is already in the database`);
  const images = await storeImages(fetched.tweets);

  transaction(db, () => {
    upsertAuthor(db, fetched.author);
    insertThread(db, {
      id: root.id,
      authorHandle: fetched.author.handle,
      title: provisionalTitle(root.text),
      publishedAt: root.createdAt,
      exam: null,
      podcastUrl: null,
      syncedAt: new Date().toISOString(),
    });
    replaceTweets(db, root.id, images.tweets);
    rebuildSearch(db);
  });

  const result: IngestResult = { threadId: root.id, tweets: fetched.tweets.length, enriched: false, warnings: [...fetched.warnings, ...images.warnings] };
  if (!enrich) {
    result.warnings.push('AI enrichment skipped: run `npm run turra:enrich` once OPENAI_API_KEY is configured');
    return result;
  }
  try {
    await enrichTurra(db, root.id, enrich);
    result.enriched = true;
  } catch (error) {
    result.warnings.push(`AI enrichment failed (${(error as Error).message}); retry with \`npm run turra:enrich -- ${root.id}\``);
  }
  return result;
}

/** (Re)generates title, categories, exam and book categories of a turra. */
export async function enrichTurra(db: Db, threadId: string, enrich: Enricher): Promise<void> {
  const thread = getThread(threadId, db);
  if (!thread) throw new Error(`Unknown turra ${threadId}`);
  const enrichment = await enrich(thread, listCategories(db));
  const bookTitles = new Map(thread.tweets.flatMap((t) => t.links).map((link) => [link.url, link]));

  transaction(db, () => {
    updateThreadEnrichment(db, threadId, enrichment.title, enrichment.exam.length > 0 ? enrichment.exam : null);
    setThreadCategories(db, threadId, enrichment.categories);
    for (const book of enrichment.books) {
      const link = bookTitles.get(book.url);
      upsertBook(db, { url: book.url, title: link?.title ?? book.url, imageUrl: link?.imageUrl ?? null, categories: book.categories });
    }
  });
}

/**
 * Refreshes the tweets of a turra from X, keeping its editorial fields (title, categories, exam).
 * If the turra no longer exists on X it is only removed with deleteMissing (X terms require removing deleted content).
 */
export async function syncTurra(
  db: Db,
  threadId: string,
  x: XClient,
  { deleteMissing = false, storeImages = createImageStore() }: { deleteMissing?: boolean; storeImages?: ImageStore } = {},
): Promise<IngestResult & { deleted: boolean }> {
  if (!getThread(threadId, db)) throw new Error(`Unknown turra ${threadId}`);

  let fetched;
  try {
    fetched = await x.fetchThread(threadId);
  } catch (error) {
    if (error instanceof XApiError && error.isNotFound) {
      if (!deleteMissing) throw new Error(`Turra ${threadId} is no longer available on X (use --delete-missing to remove it)`);
      transaction(db, () => {
        db.prepare('DELETE FROM threads WHERE id = ?').run(threadId);
        rebuildSearch(db);
      });
      return { threadId, tweets: 0, enriched: false, warnings: [], deleted: true };
    }
    throw error;
  }

  const images = await storeImages(fetched.tweets);
  transaction(db, () => {
    upsertAuthor(db, fetched.author);
    db.prepare('UPDATE threads SET published_at = ?, synced_at = ? WHERE id = ?').run(
      fetched.tweets[0]!.createdAt,
      new Date().toISOString(),
      threadId,
    );
    replaceTweets(db, threadId, images.tweets);
    rebuildSearch(db);
  });
  return { threadId, tweets: fetched.tweets.length, enriched: false, warnings: [...fetched.warnings, ...images.warnings], deleted: false };
}

function provisionalTitle(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > PROVISIONAL_TITLE_LENGTH ? `${line.slice(0, PROVISIONAL_TITLE_LENGTH - 1)}…` : line;
}
