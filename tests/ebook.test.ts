import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, test } from 'vitest';
import { bookIdentifier, buildEpub, collectImageSources, safeHref, splitTrailingPunctuation } from '../lib/ebook';
import type { Thread, Tweet } from '../lib/types';

const author = { handle: 'Recuenco', name: 'Javier G. Recuenco', xUserId: null, avatarUrl: null };
const jpeg = (byte: number) => new Uint8Array([0xff, 0xd8, byte, 0xff, 0xd9]);

function tweet(id: string, extra: Partial<Tweet> = {}): Tweet {
  return {
    id,
    text: `Texto ${id}`,
    createdAt: '2024-01-01T00:00:00.000Z',
    stats: { likes: 0, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 },
    media: [],
    links: [],
    quote: null,
    ...extra,
  };
}

function thread(id: string, publishedAt: string, tweets: Tweet[], title = `Turra ${id}`): Thread {
  return { id, title, publishedAt, author, categories: [{ slug: 'estrategia', name: 'Estrategia', description: '', intro: '', criteria: '' }], tweets, exam: null };
}

const threads = [
  thread('100', '2023-05-06T08:00:00.000Z', [
    tweet('100', {
      text: 'Hola <mundo> & "amigos" 🧵\nsegunda línea https://example.com/a @alguien',
      media: [
        { kind: 'photo', url: '/metadata/foto.jpg', posterUrl: null, alt: null },
        { kind: 'gif', url: 'https://video.twimg.com/tweet_video/g.mp4', posterUrl: '/metadata/gif.jpg', alt: null },
      ],
    }),
    tweet('101', {
      links: [{ url: 'https://www.goodreads.com/book/show/1', domain: 'goodreads.com', title: 'Un libro', description: null, imageUrl: '/metadata/card.jpg' }],
      quote: { quotedId: '9', authorHandle: 'otra', authorName: 'Otra', text: 'Citado', media: [{ kind: 'photo', url: '/metadata/perdida.jpg', posterUrl: null, alt: null }] },
    }),
  ]),
  thread('200', '2024-02-03T08:00:00.000Z', [tweet('200', { media: [{ kind: 'photo', url: 'https://pbs.twimg.com/media/x.jpg', posterUrl: null, alt: 'Una foto' }] })]),
];

// Same bytes for two sources: the image must be stored once. perdida.jpg is missing.
const images = new Map([
  ['/metadata/foto.jpg', jpeg(1)],
  ['/metadata/gif.jpg', jpeg(2)],
  ['https://pbs.twimg.com/media/x.jpg', jpeg(1)],
]);

function build() {
  const result = buildEpub({ threads, images, cover: jpeg(9), now: new Date('2026-09-28T10:00:00.123Z') });
  return { ...result, files: unzipSync(result.bytes) };
}

describe('buildEpub', () => {
  const { bytes, files, stats } = build();
  const text = (path: string) => strFromU8(files[path]!);

  test('starts with an uncompressed mimetype entry', () => {
    // Local file header: signature, then name "mimetype" at offset 30, stored (method 0) at offset 8
    expect(strFromU8(bytes.slice(30, 38))).toBe('mimetype');
    expect(bytes[8]).toBe(0);
    expect(text('mimetype')).toBe('application/epub+zip');
  });

  test('declares every file in the manifest, in chronological spine order', () => {
    const opf = text('OEBPS/content.opf');
    const packaged = Object.keys(files).filter((p) => p.startsWith('OEBPS/') && p !== 'OEBPS/content.opf');
    for (const path of packaged) expect(opf).toContain(`href="${path.slice('OEBPS/'.length)}"`);
    expect(opf.match(/<item /g)).toHaveLength(packaged.length);
    expect(opf.indexOf('text_turra_100_xhtml"/>')).toBeLessThan(opf.indexOf('text_turra_200_xhtml"/>'));
    expect(opf).toContain('properties="nav"');
    expect(opf).toContain('properties="cover-image"');
    expect(opf).toContain('<meta property="dcterms:modified">2026-09-28T10:00:00Z</meta>');
    expect(opf).toContain(`<dc:identifier id="bookid">${bookIdentifier()}</dc:identifier>`);
  });

  test('uses a stable identifier across editions', () => {
    expect(bookIdentifier()).toBe(bookIdentifier());
    expect(bookIdentifier()).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('lists every turra in the table of contents, grouped by year', () => {
    const nav = text('OEBPS/text/nav.xhtml');
    expect(nav).toMatch(/<span>2023<\/span><ol>\s*<li><a href="turra-100.xhtml">Turra 100<\/a><\/li>/);
    expect(nav).toMatch(/<span>2024<\/span><ol>\s*<li><a href="turra-200.xhtml">/);
    expect(text('OEBPS/toc.ncx')).toContain('<content src="text/turra-200.xhtml"/>');
  });

  test('escapes text and keeps links and line breaks', () => {
    const chapter = text('OEBPS/text/turra-100.xhtml');
    expect(chapter).toContain('Hola &lt;mundo&gt; &amp; &quot;amigos&quot; 🧵<br/>segunda línea');
    expect(chapter).toContain('<a href="https://example.com/a">https://example.com/a</a>');
    expect(chapter).toContain('<a href="https://x.com/alguien">@alguien</a>');
  });

  test('stores duplicated images once and leaves out missing ones', () => {
    const imageFiles = Object.keys(files).filter((p) => p.startsWith('OEBPS/images/') && !p.endsWith('cover.jpg'));
    expect(imageFiles).toHaveLength(2);
    expect(stats).toMatchObject({ threads: 2, images: 2, imagesMissing: 1 });
    const chapter = text('OEBPS/text/turra-100.xhtml');
    expect(chapter.match(/<img /g)).toHaveLength(2);
    expect(chapter).toContain('alt="Fotograma de un GIF o vídeo"');
    expect(text('OEBPS/text/turra-200.xhtml')).toContain('alt="Una foto"');
  });

  test('renders link cards as text and quotes as blockquotes', () => {
    const chapter = text('OEBPS/text/turra-100.xhtml');
    expect(chapter).toContain('<h2>Enlaces de esta turra</h2>');
    expect(chapter).toContain('<a href="https://www.goodreads.com/book/show/1">Un libro</a> <span class="domain">(goodreads.com)</span>');
    expect(chapter).not.toContain('card.jpg');
    expect(chapter).toMatch(/<blockquote>\s*<p class="quote-author">Otra @otra<\/p>/);
  });
});

test('collects photos and GIF/video frames once', () => {
  expect(collectImageSources(threads)).toEqual([
    { src: '/metadata/foto.jpg', kind: 'photo' },
    { src: '/metadata/gif.jpg', kind: 'frame' },
    { src: '/metadata/perdida.jpg', kind: 'photo' },
    { src: 'https://pbs.twimg.com/media/x.jpg', kind: 'photo' },
  ]);
});

describe('links valid for EPUB readers', () => {
  test.each([
    ['https://a.co/d/36yuK8B].', 'https://a.co/d/36yuK8B', '].'],
    ['https://example.com/x,', 'https://example.com/x', ','],
    ['https://es.wikipedia.org/wiki/Fargo_(película)', 'https://es.wikipedia.org/wiki/Fargo_(película)', ''],
    ['https://example.com/a)', 'https://example.com/a', ')'],
  ])('%s', (raw, url, rest) => {
    expect(splitTrailingPunctuation(raw)).toEqual({ url, rest });
  });

  test('encodes characters not allowed in URLs and rejects invalid ones', () => {
    expect(safeHref('https://webdianoia.com/glosario/display.php?from=action=search|by=S')).toBe(
      'https://webdianoia.com/glosario/display.php?from=action=search%7Cby=S',
    );
    expect(safeHref('https://')).toBeNull();
    expect(safeHref('javascript:alert(1)')).toBeNull();
  });
});
