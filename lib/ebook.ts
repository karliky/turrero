// EPUB 3 edition of all turras. Pure: images arrive already processed (see scripts/build-ebook.ts).
import { createHash } from 'node:crypto';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { SITE, tweetUrl } from './site';
import type { Media, Quote, Thread, Tweet } from './types';

export type ImageKind = 'photo' | 'frame';

/** An image referenced by the book: a photo, or the still frame of a GIF/video. */
export interface ImageSource {
  src: string;
  kind: ImageKind;
}

export interface EbookInput {
  threads: Thread[]; // chronological order
  /** Processed JPEG bytes by source URL; missing sources are left out of the book. */
  images: Map<string, Uint8Array>;
  cover: Uint8Array; // JPEG
  now: Date;
}

export interface EbookResult {
  bytes: Uint8Array;
  stats: { threads: number; images: number; imagesMissing: number; imageBytes: number };
}

const LANG = 'es';

export function imageSourceOf(media: Media): ImageSource | null {
  if (media.kind === 'photo') return { src: media.url, kind: 'photo' };
  return media.posterUrl ? { src: media.posterUrl, kind: 'frame' } : null;
}

/** Every image the book needs, without duplicates. */
export function collectImageSources(threads: Thread[]): ImageSource[] {
  const sources = new Map<string, ImageSource>();
  for (const tweet of threads.flatMap((thread) => thread.tweets)) {
    for (const media of [...tweet.media, ...(tweet.quote?.media ?? [])]) {
      const source = imageSourceOf(media);
      if (source && !sources.has(source.src)) sources.set(source.src, source);
    }
  }
  return [...sources.values()];
}

export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Stable identifier: every new edition is recognized as the same book by readers. */
export function bookIdentifier(): string {
  const hex = createHash('sha1').update(`${SITE.url}#ebook`).digest('hex');
  return `urn:uuid:${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

/** Splits "https://a.co/x]." into the URL and the sentence punctuation that follows it. */
export function splitTrailingPunctuation(raw: string): { url: string; rest: string } {
  let url = raw;
  for (;;) {
    const last = url.at(-1);
    const unbalancedParen = last === ')' && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0);
    if ((last && '.,;:!?]}\'"»…'.includes(last)) || unbalancedParen) url = url.slice(0, -1);
    else break;
  }
  return { url, rest: raw.slice(url.length) };
}

/** href accepted by EPUB readers: characters not allowed in URLs are encoded; null if still invalid. */
export function safeHref(url: string): string | null {
  const encoded = url.replace(/[|[\]{}<>"\\^`]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  try {
    return /^https?:$/.test(new URL(encoded).protocol) ? encoded : null;
  } catch {
    return null;
  }
}

function renderLink(url: string, label: string): string {
  const href = safeHref(url);
  return href ? `<a href="${escapeXml(href)}">${escapeXml(label)}</a>` : escapeXml(label);
}

/** Tweet text as XHTML: @mentions and URLs linked, line breaks kept. */
function renderText(text: string): string {
  return text
    .split(/(@\w{1,15}|https?:\/\/[^\s]+)/g)
    .map((part) => {
      if (/^@\w/.test(part)) return `<a href="https://x.com/${part.slice(1)}">${escapeXml(part)}</a>`;
      if (/^https?:\/\//.test(part)) {
        const { url, rest } = splitTrailingPunctuation(part);
        return renderLink(url, url.length > 50 ? `${url.slice(0, 47)}...` : url) + escapeXml(rest);
      }
      return escapeXml(part);
    })
    .join('')
    .replace(/\n/g, '<br/>');
}

function xhtmlPage(title: string, body: string, type = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${LANG}" lang="${LANG}">
<head>
<meta charset="UTF-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="../css/book.css"/>
</head>
<body${type ? ` epub:type="${type}"` : ''}>
${body}
</body>
</html>
`;
}

const CSS = `body { margin: 0 0.5em; line-height: 1.45; }
h1 { font-size: 1.5em; line-height: 1.2; margin: 0 0 0.4em; page-break-before: always; }
h2 { font-size: 1.15em; margin: 1.5em 0 0.5em; }
p { margin: 0 0 0.8em; text-align: left; }
a { color: inherit; }
.meta { font-size: 0.85em; color: #555; margin-bottom: 1.5em; }
figure { margin: 0.5em 0 1em; text-align: center; page-break-inside: avoid; }
img { max-width: 100%; height: auto; }
blockquote { margin: 0.5em 0 1em; padding: 0.3em 0 0.3em 0.8em; border-left: 0.2em solid #999; font-size: 0.92em; }
.quote-author { font-weight: bold; margin-bottom: 0.3em; }
.links li { margin-bottom: 0.4em; }
.domain { color: #555; font-size: 0.85em; }
.center { text-align: center; }
.title-page h1 { page-break-before: auto; margin-top: 3em; text-align: center; font-size: 2em; }
nav ol { list-style: none; padding-left: 1em; }
`;

interface Book {
  files: Map<string, Uint8Array>; // path inside OEBPS/ -> bytes
  imageFileBySrc: Map<string, string>;
  missing: number;
}

function figure(book: Book, media: Media): string {
  const source = imageSourceOf(media);
  const file = source ? book.imageFileBySrc.get(source.src) : undefined;
  if (!source || !file) {
    if (source) book.missing++;
    return '';
  }
  const alt = media.alt ?? (source.kind === 'frame' ? 'Fotograma de un GIF o vídeo' : 'Imagen del tweet');
  return `<figure><img src="../${file}" alt="${escapeXml(alt)}"/></figure>`;
}

function renderQuote(book: Book, quote: Quote): string {
  const author = [quote.authorName, quote.authorHandle && `@${quote.authorHandle}`].filter(Boolean).join(' ');
  return `<blockquote>
${author ? `<p class="quote-author">${escapeXml(author)}</p>` : ''}
<p>${renderText(quote.text)}</p>
${quote.media.map((media) => figure(book, media)).join('\n')}
</blockquote>`;
}

function renderTweet(book: Book, tweet: Tweet): string {
  return [
    tweet.text ? `<p>${renderText(tweet.text)}</p>` : '',
    ...tweet.media.map((media) => figure(book, media)),
    tweet.quote ? renderQuote(book, tweet.quote) : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function renderChapter(book: Book, thread: Thread): string {
  const links = [...new Map(thread.tweets.flatMap((t) => t.links).map((l) => [l.url, l])).values()];
  const meta = [
    escapeXml(thread.author.name),
    formatDate(thread.publishedAt),
    thread.categories.map((c) => escapeXml(c.name)).join(', '),
    `<a href="${escapeXml(tweetUrl(thread.author.handle, thread.id))}">Leer en X</a>`,
  ].filter(Boolean);

  return xhtmlPage(
    thread.title,
    `<section epub:type="chapter" role="doc-chapter">
<h1>${escapeXml(thread.title)}</h1>
<p class="meta">${meta.join(' · ')}</p>
${thread.tweets.map((tweet) => renderTweet(book, tweet)).join('\n')}
${
  links.length > 0
    ? `<section class="links"><h2>Enlaces de esta turra</h2><ul>
${links
  .map((l) => `<li>${renderLink(l.url, l.title ?? l.url)} <span class="domain">(${escapeXml(l.domain)})</span></li>`)
  .join('\n')}
</ul></section>`
    : ''
}
</section>`,
  );
}

const chapterFile = (thread: Thread) => `text/turra-${thread.id}.xhtml`;

function byYear(threads: Thread[]): [string, Thread[]][] {
  const years = new Map<string, Thread[]>();
  for (const thread of threads) {
    const year = thread.publishedAt.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), thread]);
  }
  return [...years];
}

function renderNav(threads: Thread[]): string {
  const toc = byYear(threads)
    .map(
      ([year, list]) => `<li><span>${year}</span><ol>
${list.map((t) => `<li><a href="turra-${t.id}.xhtml">${escapeXml(t.title)}</a></li>`).join('\n')}
</ol></li>`,
    )
    .join('\n');
  return xhtmlPage(
    'Índice',
    `<nav epub:type="toc" role="doc-toc" id="toc"><h1>Índice</h1><ol>
${toc}
</ol></nav>
<nav epub:type="landmarks" hidden="hidden"><ol>
<li><a epub:type="cover" href="cover.xhtml">Portada</a></li>
<li><a epub:type="toc" href="nav.xhtml#toc">Índice</a></li>
<li><a epub:type="bodymatter" href="${threads[0] ? `turra-${threads[0].id}.xhtml` : 'title.xhtml'}">Turras</a></li>
</ol></nav>`,
  );
}

/** EPUB 2 table of contents, kept flat: it is only a fallback for old readers. */
function renderNcx(threads: Thread[], identifier: string): string {
  const points = threads
    .map(
      (t, index) =>
        `<navPoint id="np${index + 1}" playOrder="${index + 1}"><navLabel><text>${escapeXml(t.title)}</text></navLabel><content src="${chapterFile(t)}"/></navPoint>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${LANG}">
<head><meta name="dtb:uid" content="${identifier}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>
<docTitle><text>${escapeXml(SITE.name)}</text></docTitle>
<navMap>
${points}
</navMap>
</ncx>
`;
}

function renderOpf(threads: Thread[], book: Book, identifier: string, now: Date): string {
  const authors = [...new Map(threads.map((t) => [t.author.handle, t.author.name])).values()];
  const modified = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const mediaType = (path: string) =>
    path.endsWith('.xhtml') ? 'application/xhtml+xml' : path.endsWith('.css') ? 'text/css' : path.endsWith('.ncx') ? 'application/x-dtbncx+xml' : 'image/jpeg';
  const properties = (path: string) =>
    path === 'text/nav.xhtml' ? ' properties="nav"' : path === 'images/cover.jpg' ? ' properties="cover-image"' : '';
  const id = (path: string) => (path === 'images/cover.jpg' ? 'cover-image' : path === 'toc.ncx' ? 'ncx' : path.replace(/[^a-z0-9]/gi, '_'));
  const manifest = [...book.files.keys()]
    .map((path) => `<item id="${id(path)}" href="${path}" media-type="${mediaType(path)}"${properties(path)}/>`)
    .join('\n');
  const spine = ['text/cover.xhtml', 'text/title.xhtml', 'text/nav.xhtml', ...threads.map(chapterFile)]
    .map((path) => `<itemref idref="${id(path)}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${LANG}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${identifier}</dc:identifier>
<dc:title>${escapeXml(SITE.name)}</dc:title>
${authors.map((name) => `<dc:creator>${escapeXml(name)}</dc:creator>`).join('\n')}
<dc:language>${LANG}</dc:language>
<dc:publisher>${escapeXml(SITE.name)}</dc:publisher>
<dc:description>${escapeXml(SITE.description)}</dc:description>
<dc:date>${modified.slice(0, 10)}</dc:date>
<meta property="dcterms:modified">${modified}</meta>
<meta name="cover" content="cover-image"/>
<meta property="schema:accessMode">textual</meta>
<meta property="schema:accessMode">visual</meta>
<meta property="schema:accessModeSufficient">textual</meta>
<meta property="schema:accessibilityFeature">tableOfContents</meta>
<meta property="schema:accessibilityFeature">readingOrder</meta>
<meta property="schema:accessibilityHazard">none</meta>
<meta property="schema:accessibilitySummary">Libro reflowable con índice por año. Las imágenes ilustran el texto de los hilos y el texto se puede leer sin ellas.</meta>
</metadata>
<manifest>
${manifest}
</manifest>
<spine toc="ncx">
${spine}
</spine>
</package>
`;
}

export function buildEpub({ threads, images, cover, now }: EbookInput): EbookResult {
  const identifier = bookIdentifier();
  const book: Book = { files: new Map(), imageFileBySrc: new Map(), missing: 0 };

  // Images: identical results (e.g. the same meme in several turras) are stored once
  const fileByHash = new Map<string, string>();
  let imageBytes = cover.length;
  book.files.set('images/cover.jpg', cover);
  for (const [src, bytes] of images) {
    const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 16);
    let file = fileByHash.get(hash);
    if (!file) {
      file = `images/${hash}.jpg`;
      fileByHash.set(hash, file);
      book.files.set(file, bytes);
      imageBytes += bytes.length;
    }
    book.imageFileBySrc.set(src, file);
  }

  const text = (path: string, content: string) => book.files.set(path, strToU8(content));
  text('css/book.css', CSS);
  text(
    'text/cover.xhtml',
    xhtmlPage(SITE.name, `<div class="center"><img src="../images/cover.jpg" alt="Portada: ${escapeXml(SITE.name)}"/></div>`, 'cover'),
  );
  const first = threads[0]?.publishedAt;
  const last = threads.at(-1)?.publishedAt;
  text(
    'text/title.xhtml',
    xhtmlPage(
      SITE.name,
      `<section class="title-page" epub:type="titlepage">
<h1>${escapeXml(SITE.name)}</h1>
<p class="center">Las turras de ${escapeXml(SITE.byline)}</p>
<p class="center">${threads.length} turras${first && last ? `, de ${formatDate(first)} a ${formatDate(last)}` : ''}.</p>
<p class="center">Edición generada el ${formatDate(now.toISOString())} a partir de <a href="${SITE.url}">${SITE.url.replace('https://', '')}</a>.</p>
<p class="center">Los textos pertenecen a sus autores y se publicaron originalmente en X.</p>
</section>`,
      'frontmatter',
    ),
  );
  text('text/nav.xhtml', renderNav(threads));
  for (const thread of threads) text(chapterFile(thread), renderChapter(book, thread));
  text('toc.ncx', renderNcx(threads, identifier));

  // Packaging: mimetype first and uncompressed; JPEGs stored as they are; text deflated
  const zip: Zippable = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`),
    'OEBPS/content.opf': strToU8(renderOpf(threads, book, identifier, now)),
  };
  for (const [path, bytes] of book.files) {
    zip[`OEBPS/${path}`] = path.endsWith('.jpg') ? [bytes, { level: 0 }] : bytes;
  }

  return {
    bytes: zipSync(zip, { level: 9, mtime: now }),
    stats: { threads: threads.length, images: fileByHash.size, imagesMissing: book.missing, imageBytes },
  };
}
