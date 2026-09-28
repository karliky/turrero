import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { createFileCache } from '../lib/cache';
import { migrate, openDb, type Db } from '../lib/db';
import { addTurra, enrichTurra, syncTurra } from '../lib/ingest';
import { getThread, listBooks, search } from '../lib/queries';
import { normalizeThread, XApiError, type XClient, type XThread } from '../lib/x';
import { createOpenAiEnricher, validateEnrichment, type ChatClient, type Enricher } from '../lib/ai';
import { renderObsidianNote } from '../lib/obsidian';
import type { ImageStore } from '../lib/images';
import { rootResponse, searchPage1, searchPage2 } from './fixtures/x-thread';

const fixtureThread = normalizeThread(rootResponse, [searchPage1, searchPage2]);

// Tests never download images
const keepImages: ImageStore = async (tweets) => ({ tweets, warnings: [] });

function fakeX(thread: XThread | Error = fixtureThread): XClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async fetchThread(id) {
      calls.push(id);
      if (thread instanceof Error) throw thread;
      return thread;
    },
    async searchPosts() {
      return [];
    },
  };
}

const fakeEnricher: Enricher = async () => ({
  title: 'Un libro y un hilo',
  categories: ['libros', 'estrategia'],
  exam: [{ question: '¿De qué habla?', options: ['De un libro', 'De cocina', 'De nada'], answer: 0 }],
  books: [{ url: 'https://www.goodreads.com/book/show/1-libro', categories: ['Negocios y empresa'] }],
});

let db: Db;

beforeEach(() => {
  db = openDb(':memory:');
  migrate(db);
  db.prepare("INSERT INTO categories (slug, name, description, position) VALUES ('estrategia', 'Estrategia', 'desc', 0), ('libros', 'Libros', 'desc', 1)").run();
});

describe('addTurra', () => {
  test('stores the thread from X and enriches it', async () => {
    const x = fakeX();
    const result = await addTurra(db, 'https://x.com/autora/status/1000?s=20', x, fakeEnricher, keepImages);

    expect(x.calls).toEqual(['1000']);
    expect(result).toMatchObject({ threadId: '1000', tweets: 4, enriched: true });

    const thread = getThread('1000', db)!;
    expect(thread.title).toBe('Un libro y un hilo');
    expect(thread.author).toMatchObject({ handle: 'autora', name: 'La Autora', xUserId: '1' });
    expect(thread.publishedAt).toBe('2024-05-01T08:00:00.000Z');
    expect(thread.categories.map((c) => c.slug)).toEqual(['libros', 'estrategia']);
    expect(thread.exam).toHaveLength(1);
    expect(thread.tweets.map((t) => t.id)).toEqual(['1000', '1001', '1002', '1005']);
    expect(thread.tweets[1]!.quote?.quotedId).toBe('555');
    expect(listBooks(db)[0]).toMatchObject({ title: 'El Libro', categories: ['Negocios y empresa'] });
    expect(search('completo', 20, db).map((r) => r.tweetId)).toEqual(['1001']);
  });

  test('rejects turras that are already imported (by any of their tweets)', async () => {
    await addTurra(db, '1000', fakeX(), fakeEnricher, keepImages);
    await expect(addTurra(db, '1002', fakeX(), fakeEnricher, keepImages)).rejects.toThrow(/already/);
  });

  test('keeps the X data with a provisional title when AI enrichment fails', async () => {
    const failing: Enricher = async () => {
      throw new Error('quota exceeded');
    };
    const result = await addTurra(db, '1000', fakeX(), failing, keepImages);

    expect(result.enriched).toBe(false);
    expect(result.warnings.some((w) => w.includes('turra:enrich'))).toBe(true);
    expect(getThread('1000', db)!.title).toBe('Hoy hablamos de un libro https://www.goodreads.com/book/show/1-libro');

    await enrichTurra(db, '1000', fakeEnricher);
    expect(getThread('1000', db)!.title).toBe('Un libro y un hilo');
  });

  test('works without AI', async () => {
    const result = await addTurra(db, '1000', fakeX(), null, keepImages);
    expect(result.enriched).toBe(false);
    expect(getThread('1000', db)!.categories).toEqual([]);
  });

  test('does not write anything when X fails', async () => {
    await expect(addTurra(db, '1000', fakeX(new XApiError('Could not find tweet', 404)), fakeEnricher, keepImages)).rejects.toThrow();
    expect(getThread('1000', db)).toBeNull();
  });
});

describe('syncTurra', () => {
  test('replaces tweets but keeps editorial fields', async () => {
    await addTurra(db, '1000', fakeX(), fakeEnricher, keepImages);
    const edited: XThread = { ...fixtureThread, tweets: fixtureThread.tweets.slice(0, 2) };

    const result = await syncTurra(db, '1000', fakeX(edited), { storeImages: keepImages });

    expect(result).toMatchObject({ tweets: 2, deleted: false });
    const thread = getThread('1000', db)!;
    expect(thread.tweets).toHaveLength(2);
    expect(thread.title).toBe('Un libro y un hilo');
    expect(thread.categories).toHaveLength(2);
  });

  test('deletes turras removed from X only when asked', async () => {
    await addTurra(db, '1000', fakeX(), fakeEnricher, keepImages);
    const gone = fakeX(new XApiError('Could not find tweet', 404));

    await expect(syncTurra(db, '1000', gone, { storeImages: keepImages })).rejects.toThrow(/delete-missing/);
    expect(getThread('1000', db)).not.toBeNull();

    expect((await syncTurra(db, '1000', gone, { deleteMissing: true, storeImages: keepImages })).deleted).toBe(true);
    expect(getThread('1000', db)).toBeNull();
    expect(search('libro', 20, db)).toEqual([]);
  });

  test('follows authors renamed on X', async () => {
    await addTurra(db, '1000', fakeX(), fakeEnricher, keepImages);
    const renamed: XThread = { ...fixtureThread, author: { ...fixtureThread.author, handle: 'nuevo_nombre' } };
    await syncTurra(db, '1000', fakeX(renamed), { storeImages: keepImages });
    expect(getThread('1000', db)!.author.handle).toBe('nuevo_nombre');
  });
});

describe('OpenAI enricher', () => {
  const categories = [
    { slug: 'estrategia', name: 'Estrategia', description: 'd', intro: '', criteria: 'c' },
    { slug: 'libros', name: 'Libros', description: 'd', intro: '', criteria: 'c' },
  ];

  test('sends a strict JSON schema and validates the answer', async () => {
    let request: Record<string, unknown> = {};
    const client = {
      chat: {
        completions: {
          create: async (body: Record<string, unknown>) => {
            request = body;
            return { choices: [{ message: { content: JSON.stringify(await fakeEnricher(fixtureThreadForAi(), categories)) } }] };
          },
        },
      },
    } as unknown as ChatClient;

    const result = await createOpenAiEnricher({ client, model: 'test-model' })(fixtureThreadForAi(), categories);

    expect(request.model).toBe('test-model');
    expect(request.response_format).toMatchObject({ type: 'json_schema', json_schema: { strict: true } });
    expect(result.categories).toEqual(['libros', 'estrategia']);
  });

  test('reuses cached answers for the same prompt', async () => {
    let calls = 0;
    const client = {
      chat: {
        completions: {
          create: async () => {
            calls++;
            return { choices: [{ message: { content: JSON.stringify(await fakeEnricher(fixtureThreadForAi(), categories)) } }] };
          },
        },
      },
    } as unknown as ChatClient;
    const cache = createFileCache(mkdtempSync(join(tmpdir(), 'turrero-ai-cache-')));
    const enrich = createOpenAiEnricher({ client, model: 'm', cache });

    await enrich(fixtureThreadForAi(), categories);
    const second = await enrich(fixtureThreadForAi(), categories);

    expect(calls).toBe(1);
    expect(second.title).toBe('Un libro y un hilo');
  });

  test('drops invalid categories, questions and books from the model output', () => {
    const result = validateEnrichment(
      {
        title: '  Título  ',
        categories: ['inventada', 'estrategia', 'estrategia'],
        exam: [
          { question: 'ok', options: ['a', 'b', 'c'], answer: 2 },
          { question: 'mal', options: ['a', 'b'], answer: 0 },
          { question: 'fuera', options: ['a', 'b', 'c'], answer: 3 },
        ],
        books: [
          { url: 'https://www.goodreads.com/book/show/1', categories: ['Historia y biografías', 'Cocina'] },
          { url: 'https://otro.com', categories: ['Historia y biografías'] },
        ],
      },
      categories,
      ['https://www.goodreads.com/book/show/1'],
    );
    expect(result).toEqual({
      title: 'Título',
      categories: ['estrategia'],
      exam: [{ question: 'ok', options: ['a', 'b', 'c'], answer: 2 }],
      books: [{ url: 'https://www.goodreads.com/book/show/1', categories: ['Historia y biografías'] }],
    });
    expect(() => validateEnrichment({ title: 'x', categories: ['inventada'] }, categories, [])).toThrow(/category/);
  });
});

test('renders an Obsidian note', async () => {
  await addTurra(db, '1000', fakeX(), fakeEnricher, keepImages);
  const note = renderObsidianNote(getThread('1000', db)!, new Date('2026-01-02T03:04:00Z'));
  expect(note).toContain('created: 2026-01-02 03:04');
  expect(note).toContain('source: "https://x.com/autora/status/1000"');
  expect(note).toContain('  - libros');
  expect(note).toContain('# Un libro y un hilo');
  expect(note).toContain('2. Texto largo completo de más de 280 caracteres');
  expect(note).toContain('- [El Libro](https://www.goodreads.com/book/show/1-libro)');
  expect(note).toContain('- [[Estrategia]]');
});

function fixtureThreadForAi() {
  return {
    id: '1000',
    title: 'x',
    publishedAt: '2024-05-01T08:00:00.000Z',
    author: fixtureThread.author,
    categories: [],
    tweets: fixtureThread.tweets,
    exam: null,
  };
}
