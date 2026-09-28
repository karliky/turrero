import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { openDb } from '../lib/db';
import { listGlossary } from '../lib/queries';
import { slugify } from '../lib/text';
import { GLOSSARY_GROUPS } from '../lib/types';

interface Entry {
  slug: string;
  term: string;
  short: string;
  body: string;
  group: string;
  aliases: string[];
  related: string[];
  sources: { threadId: string; tweetId: string | null }[];
}

const dir = join(process.cwd(), 'data', 'glossary');
const entries = JSON.parse(readFileSync(join(dir, 'glossary.json'), 'utf8')) as Entry[];
const redirects = JSON.parse(readFileSync(join(dir, 'redirects.json'), 'utf8')) as Record<string, string>;
const slugs = new Set(entries.map((e) => e.slug));

// Filler that makes definitions sound machine-written; the glossary must say things plainly
const FILLER = [
  'en el contexto del cps',
  'en el ámbito de',
  'juega un papel',
  'crucial',
  'cabe destacar',
  'en otras palabras',
  'es importante',
  'herramienta poderosa',
  'sinergia',
  'holístic',
  'desbloquear',
];

describe('glossary content', () => {
  test('slugs are unique, derived from the term and every group exists', () => {
    expect(slugs.size).toBe(entries.length);
    for (const e of entries) {
      expect(e.slug, e.term).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(Object.keys(GLOSSARY_GROUPS), e.slug).toContain(e.group);
      expect(e.term.charAt(0), e.slug).toBe(e.term.charAt(0).toUpperCase());
    }
  });

  test('definitions are short, plain and do not open by repeating the term', () => {
    for (const e of entries) {
      expect(e.short.split(/\s+/).length, e.slug).toBeLessThanOrEqual(22);
      const text = `${e.short} ${e.body}`.toLowerCase();
      for (const phrase of FILLER) expect(text, `${e.slug}: «${phrase}»`).not.toContain(phrase);
      expect(e.short.toLowerCase().startsWith(e.term.toLowerCase()), e.slug).toBe(false);
      expect(/^(se refiere a|es un concepto|término que|este término)/i.test(e.short), e.slug).toBe(false);
    }
  });

  test('related terms, aliases and redirects are consistent', () => {
    const owners = new Map<string, string>();
    for (const e of entries) {
      for (const slug of e.related) expect(slugs, `${e.slug} → ${slug}`).toContain(slug);
      for (const alias of e.aliases) {
        const key = slugify(alias);
        expect(owners.get(key) ?? e.slug, `alias «${alias}» in ${e.slug} and ${owners.get(key)}`).toBe(e.slug);
        owners.set(key, e.slug);
      }
    }
    for (const [old, target] of Object.entries(redirects)) {
      expect(slugs, `${old} → ${target}`).toContain(target);
      expect(slugs.has(old), `${old} is a live entry and a redirect`).toBe(false);
    }
  });

  test('reads like a person wrote it: no semicolons or dashes joining ideas', () => {
    for (const e of entries) {
      expect(`${e.short} ${e.body}`, e.slug).not.toMatch(/[;—–]/);
    }
  });

  test('nothing about the website itself', () => {
    const terms = entries.map((e) => e.term.toLowerCase());
    for (const term of ['scraping de hilos', 'grafo de turras', 'enriquecimiento de metadatos']) expect(terms).not.toContain(term);
  });
});

describe('committed database', () => {
  const db = openDb(undefined, { readOnly: true });

  test('every quote in «» is literal, from a turra or a tweet it quotes', () => {
    const fold = (text: string) =>
      text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9*]+/g, ' ').trim();
    const texts = [
      ...(db.prepare('SELECT text FROM tweets').all() as { text: string }[]),
      ...(db.prepare('SELECT text FROM quotes').all() as { text: string }[]),
    ];
    const corpus = fold(texts.map((row) => row.text).join(' '));
    for (const e of entries) {
      for (const quote of `${e.short} ${e.body}`.match(/«[^»]+»/g) ?? []) {
        // Short phrases are names or terms, not quotes
        if (quote.split(/\s+/).length < 4 || /^«[A-Z][^»]*: /.test(quote)) continue;
        expect(corpus.includes(fold(quote.slice(1, -1))), `${e.slug}: ${quote}`).toBe(true);
      }
    }
  });

  test('has the reviewed glossary and every source points to a real turra', () => {
    const glossary = listGlossary(db);
    expect(glossary.map((e) => e.slug).sort()).toEqual([...slugs].sort());
    for (const e of entries) {
      const stored = glossary.find((g) => g.slug === e.slug)!;
      // Sources whose turra no longer exists are dropped by listGlossary: none should be
      expect(stored.sources.length, e.slug).toBe(e.sources.length);
      for (const source of e.sources.filter((s) => s.tweetId)) {
        const tweet = db.prepare('SELECT thread_id FROM tweets WHERE id = ?').get(source.tweetId) as { thread_id: string } | undefined;
        expect(tweet?.thread_id, `${e.slug}: tweet ${source.tweetId}`).toBe(source.threadId);
      }
    }
  });
});
