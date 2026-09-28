import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { openDb } from '../lib/db';
import { listCategories, listThreadIds } from '../lib/queries';
import { BOOK_CATEGORIES, LEGACY_CATEGORY_URLS } from '../lib/site';

// The reviewed categorization (data/categorization/) and the committed database must agree.
interface Taxonomy {
  rules: { min_primary: number };
  categories: { slug: string; name: string; description: string; intro: string; criteria: string; position: number }[];
  retired: Record<string, string>;
}
interface Assignment {
  id: string;
  primary: string;
  secondary: string[];
}

const dir = join(process.cwd(), 'data', 'categorization');
const taxonomy = JSON.parse(readFileSync(join(dir, 'taxonomy.json'), 'utf8')) as Taxonomy;
const assignments = JSON.parse(readFileSync(join(dir, 'assignments.json'), 'utf8')) as Assignment[];
const slugs = taxonomy.categories.map((c) => c.slug);

describe('taxonomy', () => {
  test('categories are unique, documented and fit for search results', () => {
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(taxonomy.categories.map((c) => c.position)).size).toBe(slugs.length);
    for (const category of taxonomy.categories) {
      expect(category.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(category.description.length, category.slug).toBeGreaterThanOrEqual(120);
      expect(category.description.length, category.slug).toBeLessThanOrEqual(160);
      expect(category.intro.length, category.slug).toBeGreaterThan(100);
      expect(category.criteria, category.slug).toContain('No entra');
    }
  });

  test('the CPS umbrella is not a category', () => {
    expect(taxonomy.categories.map((c) => c.name.toLowerCase())).not.toContain('resolución de problemas complejos');
  });

  test('every retired category redirects to a page that exists', () => {
    for (const [slug, destination] of Object.entries(taxonomy.retired)) {
      expect(LEGACY_CATEGORY_URLS[slug], slug).toBe(destination);
    }
    for (const [slug, destination] of Object.entries(LEGACY_CATEGORY_URLS)) {
      expect(slugs, `${slug} must not shadow a current category`).not.toContain(slug);
      const path = destination.split('?')[0]!.slice(1);
      expect([...slugs, 'biblioteca', 'turras'], destination).toContain(path);
    }
  });
});

describe('assignments', () => {
  test('one primary and at most two different secondary categories, all known', () => {
    for (const a of assignments) {
      const all = [a.primary, ...a.secondary];
      expect(a.secondary.length, a.id).toBeLessThanOrEqual(2);
      expect(new Set(all).size, a.id).toBe(all.length);
      for (const slug of all) expect(slugs, a.id).toContain(slug);
    }
  });

  test(`every category is the primary of at least ${taxonomy.rules.min_primary} turras`, () => {
    for (const slug of slugs) {
      expect(assignments.filter((a) => a.primary === slug).length, slug).toBeGreaterThanOrEqual(taxonomy.rules.min_primary);
    }
  });
});

describe('committed database', () => {
  const db = openDb(undefined, { readOnly: true });

  test('covers every turra exactly once', () => {
    const ids = listThreadIds(db);
    expect(new Set(assignments.map((a) => a.id)).size).toBe(assignments.length);
    expect([...assignments.map((a) => a.id)].sort()).toEqual([...ids].sort());
  });

  test('has the taxonomy categories and the reviewed links, primary first', () => {
    expect(listCategories(db).map((c) => c.slug)).toEqual(
      [...taxonomy.categories].sort((a, b) => a.position - b.position).map((c) => c.slug),
    );
    const rows = db.prepare('SELECT thread_id, category_slug FROM thread_categories ORDER BY thread_id, position').all() as {
      thread_id: string;
      category_slug: string;
    }[];
    const stored = new Map<string, string[]>();
    for (const row of rows) stored.set(row.thread_id, [...(stored.get(row.thread_id) ?? []), row.category_slug]);
    for (const a of assignments) expect(stored.get(a.id), a.id).toEqual([a.primary, ...a.secondary]);
  });
});

describe('books', () => {
  const bookTaxonomy = JSON.parse(readFileSync(join(dir, 'books-taxonomy.json'), 'utf8')) as {
    rules: { min_primary: number };
    categories: { name: string; criteria: string }[];
  };
  const bookAssignments = JSON.parse(readFileSync(join(dir, 'books-assignments.json'), 'utf8')) as {
    url: string;
    categories: string[];
  }[];
  const names = bookTaxonomy.categories.map((c) => c.name);

  test('the site filters are exactly the reviewed categories', () => {
    expect([...BOOK_CATEGORIES].sort()).toEqual([...names].sort());
    for (const category of bookTaxonomy.categories) expect(category.criteria, category.name).toContain('No entra');
  });

  test('every book has one primary and at most one secondary category, and each category is big enough', () => {
    for (const book of bookAssignments) {
      expect(book.categories.length, book.url).toBeGreaterThanOrEqual(1);
      expect(book.categories.length, book.url).toBeLessThanOrEqual(2);
      for (const name of book.categories) expect(names, book.url).toContain(name);
    }
    for (const name of names) {
      expect(bookAssignments.filter((b) => b.categories[0] === name).length, name).toBeGreaterThanOrEqual(bookTaxonomy.rules.min_primary);
    }
  });

  test('the committed database has the reviewed categories for every book', () => {
    const db = openDb(undefined, { readOnly: true });
    const rows = db.prepare('SELECT url, categories_json FROM books').all() as { url: string; categories_json: string }[];
    expect(rows.map((r) => r.url).sort()).toEqual(bookAssignments.map((b) => b.url).sort());
    const stored = new Map(rows.map((r) => [r.url, JSON.parse(r.categories_json) as string[]]));
    for (const book of bookAssignments) expect(stored.get(book.url), book.url).toEqual(book.categories);
  });
});
