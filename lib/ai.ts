// AI enrichment of a turra with OpenAI: title, categories, exam and categories of the linked books.
import OpenAI from 'openai';
import { BOOK_CATEGORIES } from './site';
import type { Category, ExamQuestion, Thread } from './types';

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini';

export interface Enrichment {
  title: string;
  categories: string[]; // category slugs, most relevant first
  exam: ExamQuestion[];
  books: { url: string; categories: string[] }[];
}

export type Enricher = (thread: Thread, categories: Category[]) => Promise<Enrichment>;

/** Minimal slice of the OpenAI client used here, so tests can pass a fake. */
export type ChatClient = Pick<OpenAI, 'chat'>;

const MAX_INPUT_CHARS = 60_000;

export function createOpenAiEnricher({
  client = new OpenAI(),
  model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
}: { client?: ChatClient; model?: string } = {}): Enricher {
  return async (thread, categories) => {
    const bookUrls = [...new Set(thread.tweets.flatMap((t) => t.links.map((l) => l.url)).filter(isGoodreadsBook))];
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt(categories) },
        { role: 'user', content: userPrompt(thread, bookUrls) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'turra_enrichment', strict: true, schema: responseSchema(categories) },
      },
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error('OpenAI returned an empty response');
    return validateEnrichment(JSON.parse(content), categories, bookUrls);
  };
}

function isGoodreadsBook(url: string): boolean {
  return /goodreads\.com\/(?:[a-z]{2}\/)?book\/show\//.test(url);
}

function systemPrompt(categories: Category[]): string {
  return [
    'Eres editor de El Turrero Post, un archivo de hilos de X ("turras") sobre resolución de problemas complejos.',
    'Dada una turra, devuelve en español:',
    '- title: un titular breve e informativo (máximo 90 caracteres, sin comillas ni emojis).',
    '- categories: entre 1 y 3 categorías de la lista, la más relevante primero.',
    '- exam: 3 preguntas de comprensión sobre la turra, cada una con 3 opciones y el índice (0-2) de la correcta.',
    '- books: para cada URL de Goodreads indicada, sus categorías de la lista de categorías de libros.',
    '',
    'Categorías:',
    ...categories.map((c) => `- ${c.slug}: ${c.description}`),
    '',
    `Categorías de libros: ${BOOK_CATEGORIES.join(', ')}`,
  ].join('\n');
}

function userPrompt(thread: Thread, bookUrls: string[]): string {
  const text = thread.tweets.map((tweet) => tweet.text).join('\n\n').slice(0, MAX_INPUT_CHARS);
  return [`Autor: ${thread.author.name}`, `Turra:\n${text}`, `URLs de Goodreads:\n${bookUrls.join('\n') || '(ninguna)'}`].join('\n\n');
}

function responseSchema(categories: Category[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'categories', 'exam', 'books'],
    properties: {
      title: { type: 'string' },
      categories: { type: 'array', items: { type: 'string', enum: categories.map((c) => c.slug) } },
      exam: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'answer'],
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            answer: { type: 'integer' },
          },
        },
      },
      books: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['url', 'categories'],
          properties: {
            url: { type: 'string' },
            categories: { type: 'array', items: { type: 'string', enum: [...BOOK_CATEGORIES] } },
          },
        },
      },
    },
  };
}

/** Checks the model output instead of trusting it. */
export function validateEnrichment(value: unknown, categories: Category[], bookUrls: string[]): Enrichment {
  const data = value as Partial<Enrichment>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) throw new Error('AI enrichment: empty title');

  const known = new Set(categories.map((c) => c.slug));
  const slugs = [...new Set((data.categories ?? []).filter((slug) => known.has(slug)))].slice(0, 3);
  if (slugs.length === 0) throw new Error('AI enrichment: no valid category');

  const exam = (data.exam ?? []).filter(
    (q): q is ExamQuestion =>
      typeof q?.question === 'string' &&
      Array.isArray(q.options) &&
      q.options.length === 3 &&
      q.options.every((option) => typeof option === 'string') &&
      Number.isInteger(q.answer) &&
      q.answer >= 0 &&
      q.answer < 3,
  );

  const bookCategories = new Set<string>(BOOK_CATEGORIES);
  const books = (data.books ?? [])
    .filter((book) => bookUrls.includes(book.url))
    .map((book) => ({ url: book.url, categories: book.categories.filter((c) => bookCategories.has(c)) }));

  return { title, categories: slugs, exam, books };
}
