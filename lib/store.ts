// Write operations. Callers wrap them in transaction() when several must be atomic.
import type { Db } from './db';
import type { Author, ExamQuestion, Tweet } from './types';

export interface ThreadRecord {
  id: string;
  authorHandle: string;
  title: string;
  publishedAt: string;
  exam: ExamQuestion[] | null;
  podcastUrl: string | null;
  syncedAt: string | null;
}

export function upsertAuthor(db: Db, author: Author): void {
  // An author renamed on X keeps its X user id: move the row (and its threads) to the new handle
  if (author.xUserId) {
    db.prepare('UPDATE authors SET handle = ? WHERE x_user_id = ? AND handle <> ?').run(
      author.handle,
      author.xUserId,
      author.handle,
    );
  }
  db.prepare(
    `INSERT INTO authors (handle, x_user_id, name, avatar_url) VALUES (?, ?, ?, ?)
     ON CONFLICT (handle) DO UPDATE SET
       x_user_id = coalesce(excluded.x_user_id, x_user_id),
       name = excluded.name,
       avatar_url = coalesce(excluded.avatar_url, avatar_url)`,
  ).run(author.handle, author.xUserId, author.name, author.avatarUrl);
}

export function insertThread(db: Db, thread: ThreadRecord): void {
  db.prepare(
    `INSERT INTO threads (id, author_handle, title, published_at, exam_json, podcast_url, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    thread.id,
    thread.authorHandle,
    thread.title,
    thread.publishedAt,
    thread.exam ? JSON.stringify(thread.exam) : null,
    thread.podcastUrl,
    thread.syncedAt,
  );
}

/** Replaces all tweets of a thread (and their media, links and quotes) keeping array order. */
export function replaceTweets(db: Db, threadId: string, tweets: Tweet[]): void {
  db.prepare('DELETE FROM tweets WHERE thread_id = ?').run(threadId);

  const insertTweet = db.prepare(
    `INSERT INTO tweets (id, thread_id, position, text, created_at, likes, retweets, replies, quotes, bookmarks, views)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertMedia = db.prepare(
    'INSERT INTO media (tweet_id, position, kind, url, poster_url, alt) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertLink = db.prepare(
    'INSERT OR IGNORE INTO links (tweet_id, url, domain, title, description, image_url) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertQuote = db.prepare(
    'INSERT INTO quotes (tweet_id, quoted_id, author_handle, author_name, text, media_json) VALUES (?, ?, ?, ?, ?, ?)',
  );

  tweets.forEach((tweet, position) => {
    const { likes, retweets, replies, quotes, bookmarks, views } = tweet.stats;
    insertTweet.run(tweet.id, threadId, position, tweet.text, tweet.createdAt, likes, retweets, replies, quotes, bookmarks, views);
    tweet.media.forEach((media, index) => {
      insertMedia.run(tweet.id, index, media.kind, media.url, media.posterUrl, media.alt);
    });
    for (const link of tweet.links) {
      insertLink.run(tweet.id, link.url, link.domain, link.title, link.description, link.imageUrl);
    }
    if (tweet.quote) {
      const quote = tweet.quote;
      insertQuote.run(
        tweet.id,
        quote.quotedId,
        quote.authorHandle,
        quote.authorName,
        quote.text,
        quote.media.length ? JSON.stringify(quote.media) : null,
      );
    }
  });
}

export function setThreadCategories(db: Db, threadId: string, slugs: string[]): void {
  db.prepare('DELETE FROM thread_categories WHERE thread_id = ?').run(threadId);
  const insert = db.prepare('INSERT INTO thread_categories (thread_id, category_slug, position) VALUES (?, ?, ?)');
  slugs.forEach((slug, position) => insert.run(threadId, slug, position));
}

export function updateThreadEnrichment(db: Db, threadId: string, title: string, exam: ExamQuestion[] | null): void {
  db.prepare('UPDATE threads SET title = ?, exam_json = ? WHERE id = ?').run(
    title,
    exam ? JSON.stringify(exam) : null,
    threadId,
  );
}

export function upsertBook(db: Db, book: { url: string; title: string; imageUrl: string | null; categories: string[] }): void {
  db.prepare(
    `INSERT INTO books (url, title, image_url, categories_json) VALUES (?, ?, ?, ?)
     ON CONFLICT (url) DO UPDATE SET title = excluded.title,
       image_url = coalesce(excluded.image_url, image_url), categories_json = excluded.categories_json`,
  ).run(book.url, book.title, book.imageUrl, JSON.stringify(book.categories));
}
