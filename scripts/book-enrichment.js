import booksNotEnriched from '../db/books-not-enriched.json' assert { type: 'json' };
import currentBooks from '../db/books.json' assert { type: 'json' };
import fs from 'fs';
import puppeteer from 'puppeteer';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksToEnrich = booksNotEnriched.filter(book => {
    return currentBooks.find(currentBook => currentBook.id === book.id && (!('categories' in currentBook) || currentBook.categories.length === 0));
});

console.log('# Pending books to enrich', booksToEnrich.length);

(async () => {
    const browser = await puppeteer.launch({ slowMo: 10 });
    const page = await browser.newPage();

    for (const book of booksToEnrich) {
        await page.goto(book.url, { waitUntil: 'networkidle2' });
        const categories = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.BookPageMetadataSection__genreButton .Button__labelItem'));
            return elements.map(element => element.innerText);
        });
        console.log({ categories, title: book.title, url: book.url });
        if (categories.length > 0) book.categories = categories;
        //merge current books with enriched books
        const enrichedBooks = currentBooks.map(currentBook => {
            const enrichedBook = booksToEnrich.find(book => book.id === currentBook.id);
            const book = enrichedBook ? enrichedBook : currentBook;
            if (!('categories' in book)) book.categories = [];
            return book;
        });
        fs.writeFileSync(__dirname + '/../db/books.json', JSON.stringify(enrichedBooks, null, 4));
    }
    console.log('# Estaré ahí mismo.')
    process.exit(0);
})();