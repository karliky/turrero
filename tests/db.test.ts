import { expect, test } from 'vitest';
import { migrate, openDb } from '../lib/db';

test('migrate creates the schema once and is idempotent', () => {
  const db = openDb(':memory:');
  expect(migrate(db)).toBeGreaterThan(0);
  expect(migrate(db)).toBe(0);
  const version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  expect(version).toBeGreaterThanOrEqual(1);
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
  expect(tables).toEqual(expect.arrayContaining(['authors', 'threads', 'tweets', 'media', 'links', 'quotes', 'categories', 'books', 'glossary', 'search']));
});

test('committed database is consistent', () => {
  const db = openDb(undefined, { readOnly: true });
  expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  const orphanThreads = db
    .prepare('SELECT id FROM threads WHERE id NOT IN (SELECT thread_id FROM thread_categories)')
    .all();
  expect(orphanThreads).toEqual([]);
  const emptyThreads = db.prepare('SELECT id FROM threads WHERE id NOT IN (SELECT thread_id FROM tweets)').all();
  expect(emptyThreads).toEqual([]);
  const rootMismatch = db
    .prepare('SELECT t.id FROM threads t JOIN tweets w ON w.thread_id = t.id AND w.position = 0 WHERE w.id <> t.id')
    .all();
  expect(rootMismatch).toEqual([]);
});
