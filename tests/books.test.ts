import { describe, expect, test } from 'vitest';
import { createCatalogClient, goodreadsId, mainTitle, matchScore, subtitleOf, titleScore } from '../lib/books';

describe('title matching', () => {
  test('uses the main title and ignores accents, case and subtitles', () => {
    expect(mainTitle('Good Strategy Bad Strategy: The Difference and Why It Matters')).toBe('Good Strategy Bad Strategy');
    expect(titleScore('The Righteous Mind: Why Good People…', 'The righteous mind')).toBe(1);
    expect(titleScore('Resolución de problemas', 'RESOLUCION de Problemas (2ª ed.)')).toBe(1);
    expect(titleScore('The War of Art', 'The Art of War')).toBeLessThan(0.6);
    expect(titleScore('Loonshots', 'Moonshots')).toBe(0);
  });

  test('a title search result must match the subtitle too', () => {
    expect(subtitleOf('The Attention Merchants: The Epic Scramble to Get Insid…')).toBe('The Epic Scramble to Get');
    expect(matchScore('Proof: The Science of Booze', 'Proof')).toBe(0);
    expect(matchScore('Lights Out: Pride, Delusion, and the Fall of General Electric', 'Lights Out', 'A Novel')).toBe(0);
    expect(matchScore('Good Strategy Bad Strategy: The Difference and Why It Matters', 'Good Strategy, Bad Strategy', 'The Difference and Why It Matters')).toBe(1);
    expect(matchScore('Winning', 'Winning')).toBe(0); // too generic without a subtitle to check
    expect(matchScore('The Second Machine Age', 'The second machine age')).toBe(1);
  });

  test('reads the Goodreads id from both URL styles', () => {
    expect(goodreadsId('https://www.goodreads.com/book/show/11721966-good-strategy-bad-strategy')).toBe('11721966');
    expect(goodreadsId('https://goodreads.com/es/book/show/131885.Fearful_Symmetry')).toBe('131885');
    expect(goodreadsId('https://example.com')).toBeNull();
  });
});

describe('catalog lookup', () => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  test('reads author and cover from the Goodreads page first', async () => {
    const page =
      '<html><script type="application/ld+json">{"@type":"Book","name":"Winning","image":"https://img/winning.jpg","author":[{"@type":"Person","name":"Jack Welch"}]}</script></html>';
    const urls: string[] = [];
    const client = createCatalogClient({
      minIntervalMs: 0,
      fetch: (async (url: string) => {
        urls.push(url);
        return new Response(page, { status: 200 });
      }) as typeof fetch,
    });
    const result = await client.lookup({ url: 'https://www.goodreads.com/book/show/1-winning', title: 'Winning' });
    expect(result).toMatchObject({ author: 'Jack Welch', coverUrl: 'https://img/winning.jpg', source: 'goodreads' });
    expect(urls).toEqual(['https://www.goodreads.com/book/show/1-winning']);
  });

  test('trusts an Open Library match by Goodreads id', async () => {
    const urls: string[] = [];
    const client = createCatalogClient({
      minIntervalMs: 0,
      fetch: (async (url: string) => {
        urls.push(url);
        return json({ docs: [{ title: 'Good Strategy Bad Strategy', author_name: ['Richard Rumelt'], cover_i: 42 }] });
      }) as typeof fetch,
    });
    const result = await client.lookup({ url: 'https://www.goodreads.com/book/show/11721966-x', title: 'Good Strategy Bad Strategy' });
    expect(result).toMatchObject({
      author: 'Richard Rumelt',
      coverUrl: 'https://covers.openlibrary.org/b/id/42-L.jpg',
      source: 'openlibrary-goodreads',
    });
    expect(urls).toHaveLength(2); // Goodreads page (no data here), then Open Library
  });

  test('falls back to Google Books and rejects titles that do not match', async () => {
    const client = createCatalogClient({
      minIntervalMs: 0,
      fetch: (async (url: string) =>
        url.includes('openlibrary')
          ? json({ docs: [{ title: 'Something else entirely', author_name: ['Nobody'], cover_i: 1 }] })
          : json({
              items: [
                {
                  volumeInfo: {
                    title: 'The Social Psychology of Organizations',
                    subtitle: 'Second edition',
                    authors: ['Daniel Katz'],
                    imageLinks: { thumbnail: 'http://books.google.com/x?id=1&zoom=1&edge=curl' },
                  },
                },
              ],
            })) as typeof fetch,
    });
    const result = await client.lookup({ url: 'https://example.com/book', title: 'The Social Psychology of Organizations' });
    expect(result).toMatchObject({
      author: 'Daniel Katz',
      coverUrl: 'https://books.google.com/x?id=1&zoom=1',
      source: 'googlebooks',
      score: 1,
    });
  });
});
