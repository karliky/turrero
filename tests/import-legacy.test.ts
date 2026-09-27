import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { migrate, openDb, type Db } from '../lib/db';
import { importLegacy, parseCsv, type ImportReport } from '../scripts/import-legacy';

const A1 = '1610940502609723393';
const A2 = '1610940502609723394';
const A3 = '1610940502609723395';
const C1 = '1700000000000000000';
const C2 = '1700000000000000001';

function tweet(id: string, author: string, extra: Record<string, unknown> = {}) {
  return { id, tweet: `texto ${id}`, time: '2023-01-05T09:53:18.000Z', author: `https://x.com/${author}`, stats: {}, ...extra };
}

function writeFixtures(): { dataDir: string; publicDir: string } {
  const root = mkdtempSync(join(tmpdir(), 'turrero-legacy-'));
  const dataDir = join(root, 'db');
  const publicDir = join(root, 'public');
  mkdirSync(dataDir);
  mkdirSync(join(publicDir, 'metadata'), { recursive: true });
  mkdirSync(join(publicDir, 'podcast'), { recursive: true });
  writeFileSync(join(publicDir, 'metadata', 'AAAkey1.jpeg'), '');
  writeFileSync(join(publicDir, 'metadata', 'cardimg.jpeg'), '');
  writeFileSync(join(publicDir, 'metadata', 'orphan.jpeg'), '');
  writeFileSync(join(publicDir, 'podcast', `${A1}.mp3`), '');

  const threadA = [
    tweet(A1, 'Recuenco', {
      time: '2023-01-01T11:02:58.000Z', // legacy bug: date of the quoted tweet
      stats: { likes: '82', views: '47.1K', quotetweet: '14', retweets: '' },
      metadata: { embed: { type: 'embed', id: 'unknown', author: 'Otra Persona\n@otra', tweet: 'citado' } },
    }),
    tweet(A2, 'Recuenco', {
      stats: { likes: '1,234' },
      metadata: {
        type: 'media',
        imgs: [
          { img: 'https://pbs.twimg.com/media/AAAkey1?format=jpg&name=small', url: '' },
          { img: 'https://pbs.twimg.com/media/BBBkey2?format=jpg&name=small', url: '' },
        ],
      },
    }),
    tweet(A3, 'Recuenco', { metadata: { type: 'card', img: 'https://pbs.twimg.com/card_img/1/cardimg', url: 'https://t.co/x' } }),
  ];
  const subsetOfA = [threadA[1], threadA[2]];
  const threadC = [tweet(C1, 'otroautor', { authorName: 'Otro Autor' }), tweet(C2, 'otroautor')];

  const json = (file: string, value: unknown) => writeFileSync(join(dataDir, file), JSON.stringify(value));
  json('tweets.json', [threadA, subsetOfA, threadC]);
  json('tweets_enriched.json', [
    { id: A1, type: 'embed', embeddedTweetId: '1600000000000000000', author: 'Otra Persona\n@otra', tweet: 'citado', url: '' },
    { id: A2, type: 'media', img: './metadata/AAAkey1.jpeg', url: '' },
    { id: A3, type: 'card', img: './metadata/cardimg.jpeg', url: 'https://www.goodreads.com/book/show/1', domain: 'goodreads.com', title: 'Un libro', media: 'goodreads' },
  ]);
  json('tweets_map.json', [
    { id: A1, categories: 'estrategia,lectura-de-señales' },
    { id: C1, categories: 'gaming' },
  ]);
  json('tweets_summary.json', [
    { id: A1, summary: 'Primer resumen' },
    { id: C1, summary: 'Turra de otro autor' },
    { id: A1, summary: 'Resumen definitivo' },
  ]);
  json('tweets_exam.json', [
    { id: A1, questions: [{ question: '¿Qué?', options: ['a', 'b', 'c'], answer: 2 }] },
    { id: C1, questions: [] },
  ]);
  json('tweets_podcast.json', [{ id: A1 }]);
  json('books.json', [
    { id: A3, url: 'https://www.goodreads.com/book/show/1', img: './metadata/cardimg.jpeg', title: 'Un libro', categories: ['Business'] },
    { id: A3, url: 'https://www.goodreads.com/book/show/1', img: './metadata/cardimg.jpeg', title: 'Un libro', categories: ['Psychology'] },
  ]);
  writeFileSync(
    join(dataDir, 'glosario.csv'),
    '"Acoplamiento suelto", "Definición, con coma",""\r\nAntifrágil,"Línea 1\nLínea 2",Véase X\r\n',
  );
  return { dataDir, publicDir };
}

describe('importLegacy', () => {
  let db: Db;
  let report: ImportReport;

  beforeAll(() => {
    db = openDb(':memory:');
    migrate(db);
    report = importLegacy(db, writeFixtures());
  });

  const all = (sql: string, ...params: string[]) => db.prepare(sql).all(...params);
  const get = (sql: string, ...params: string[]) => db.prepare(sql).get(...params) as Record<string, unknown>;

  test('reports no errors', () => {
    expect(report.errors).toEqual([]);
  });

  test('drops threads fully contained in another thread', () => {
    expect(report.counts.duplicateThreadsRemoved).toBe(1);
    expect(all('SELECT id FROM threads ORDER BY id')).toEqual([{ id: A1 }, { id: C1 }]);
    expect(get('SELECT count(*) AS n FROM tweets WHERE thread_id = ?', A1).n).toBe(3);
  });

  test('derives dates from the tweet id instead of the scraped time', () => {
    expect(get('SELECT published_at FROM threads WHERE id = ?', A1).published_at).toBe('2023-01-05T10:05:20.306Z');
    expect(report.counts.datesFixed).toBeGreaterThanOrEqual(1);
  });

  test('normalizes stats', () => {
    expect(get('SELECT likes, views, quotes, retweets FROM tweets WHERE id = ?', A1)).toEqual({ likes: 82, views: 47100, quotes: 14, retweets: 0 });
    expect(get('SELECT likes FROM tweets WHERE id = ?', A2).likes).toBe(1234);
  });

  test('keeps every image of multi-image tweets, preferring local files', () => {
    expect(all('SELECT kind, url FROM media WHERE tweet_id = ? ORDER BY position', A2)).toEqual([
      { kind: 'photo', url: '/metadata/AAAkey1.jpeg' },
      { kind: 'photo', url: 'https://pbs.twimg.com/media/BBBkey2?format=jpg&name=small' },
    ]);
  });

  test('imports quotes with the resolved quoted id and split author', () => {
    expect(get('SELECT quoted_id, author_handle, author_name, text FROM quotes WHERE tweet_id = ?', A1)).toEqual({
      quoted_id: '1600000000000000000',
      author_handle: 'otra',
      author_name: 'Otra Persona',
      text: 'citado',
    });
  });

  test('imports link cards and books with merged Spanish categories', () => {
    expect(get('SELECT url, domain, title, image_url FROM links WHERE tweet_id = ?', A3)).toEqual({
      url: 'https://www.goodreads.com/book/show/1',
      domain: 'goodreads.com',
      title: 'Un libro',
      image_url: '/metadata/cardimg.jpeg',
    });
    expect(get('SELECT categories_json FROM books').categories_json).toBe(JSON.stringify(['Psicología', 'Negocios y empresa']));
  });

  test('imports summary, ASCII categories, 0-based exam and podcast', () => {
    expect(get('SELECT title, exam_json, podcast_url FROM threads WHERE id = ?', A1)).toEqual({
      title: 'Resumen definitivo',
      exam_json: JSON.stringify([{ question: '¿Qué?', options: ['a', 'b', 'c'], answer: 1 }]),
      podcast_url: `/podcast/${A1}.mp3`,
    });
    expect(all('SELECT category_slug FROM thread_categories WHERE thread_id = ? ORDER BY position', A1)).toEqual([
      { category_slug: 'estrategia' },
      { category_slug: 'lectura-de-senales' },
    ]);
    expect(get('SELECT exam_json FROM threads WHERE id = ?', C1).exam_json).toBeNull();
  });

  test('creates one author per handle with display names', () => {
    expect(all('SELECT handle, name FROM authors ORDER BY handle')).toEqual([
      { handle: 'otroautor', name: 'Otro Autor' },
      { handle: 'Recuenco', name: 'Javier G. Recuenco' },
    ]);
  });

  test('imports the glossary and reports unreferenced media', () => {
    expect(all('SELECT term, definition, reference FROM glossary ORDER BY term')).toEqual([
      { term: 'Acoplamiento suelto', definition: 'Definición, con coma', reference: null },
      { term: 'Antifrágil', definition: 'Línea 1\nLínea 2', reference: 'Véase X' },
    ]);
    expect(report.counts.orphanMediaFiles).toBe(1);
  });

  test('builds the search index', () => {
    expect(get("SELECT count(*) AS n FROM search WHERE search MATCH 'texto'").n).toBe(5);
  });
});

test('parseCsv handles quotes, escaped quotes and CRLF', () => {
  expect(parseCsv('a,"b ""c""",d\r\n"x\ny",z\n')).toEqual([
    ['a', 'b "c"', 'd'],
    ['x\ny', 'z'],
  ]);
});
