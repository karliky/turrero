import booksNotEnriched from '../infrastructure/db/books-not-enriched.json' with { type: 'json' };
import currentBooks from '../infrastructure/db/books.json' with { type: 'json' };
import fs from 'fs';
import puppeteer from 'puppeteer';
import { createLogger } from '../infrastructure/logger.js';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
const logger = createLogger({ prefix: 'book-enrichment' });

const booksToEnrich = booksNotEnriched.filter(book => {
    return currentBooks.find(currentBook => currentBook.id === book.id && (!('categories' in currentBook) || currentBook.categories.length === 0));
});

logger.info('# Pending books to enrich', booksToEnrich.length);

(async () => {
    const browser = await puppeteer.launch({ slowMo: 10 });
    const page = await browser.newPage();

    for (const book of booksToEnrich) {
        await page.goto(book.url, { waitUntil: 'networkidle2' });
        const categories = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.BookPageMetadataSection__genreButton .Button__labelItem'));
            return elements.map(element => element.innerText);
        });
        logger.debug({ categories, title: book.title, url: book.url });
        if (categories.length > 0) book.categories = categories;
        //merge current books with enriched books
        const enrichedBooks = currentBooks.map(currentBook => {
            const enrichedBook = booksToEnrich.find(book => book.id === currentBook.id);
            const book = enrichedBook ? enrichedBook : currentBook;
            if (!('categories' in book)) book.categories = [];
            return book;
        });
        fs.writeFileSync(__dirname + '/../infrastructure/db/books.json', JSON.stringify(enrichedBooks, null, 4));
    }
    logger.info('# Estaré ahí mismo.')
    process.exit(0);
})();