import booksNotEnriched from '../infrastructure/db/books-not-enriched.json' with { type: 'json' };
import currentBooks from '../infrastructure/db/books.json' with { type: 'json' };
import fs from 'fs';
import puppeteer from 'puppeteer';
import { createLogger } from '../infrastructure/logger.js';

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { EnrichedBook, BookToEnrich, CurrentBook } from '../infrastructure/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
const logger = createLogger({ prefix: 'book-enrichment' });


const booksToEnrich: BookToEnrich[] = booksNotEnriched.filter((book: BookToEnrich) => {
    return currentBooks.find((currentBook: CurrentBook) => currentBook.id === book.id && (!('categories' in currentBook) || (currentBook.categories && currentBook.categories.length === 0)));
});

logger.info('# Pending books to enrich', booksToEnrich.length);

(async (): Promise<void> => {
    const browser = await puppeteer.launch({ slowMo: 10 });
    const page = await browser.newPage();

    for (const book of booksToEnrich) {
        await page.goto(book.url, { waitUntil: 'networkidle2' });
        const categories: string[] = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.BookPageMetadataSection__genreButton .Button__labelItem'));
            return elements.map((element: Element) => (element as HTMLElement).innerText);
        });
        logger.debug({ categories, title: book.title, url: book.url });
        if (categories.length > 0) book.categories = categories;
        
        // Merge current books with enriched books
        const enrichedBooks = currentBooks.map((currentBook: CurrentBook) => {
            const enrichedBook = booksToEnrich.find((book: BookToEnrich) => book.id === currentBook.id);
            const book: CurrentBook = enrichedBook ? enrichedBook : currentBook;
            if (!('categories' in book)) {
                (book as CurrentBook).categories = [];
            }
            return book;
        });
        fs.writeFileSync(__dirname + '/../infrastructure/db/books.json', JSON.stringify(enrichedBooks, null, 4));
    }
    logger.info('# Estaré ahí mismo.')
    process.exit(0);
})();