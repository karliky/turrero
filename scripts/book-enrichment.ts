import type { Page } from 'puppeteer';
import { 
    getScriptDirectory, 
    createScriptLogger, 
    createBrowser, 
    runWithErrorHandling 
} from './libs/common-utils.js';
import { 
    createDataAccess, 
    getBooksToEnrich, 
    mergeEnrichedBooks 
} from './libs/data-access.js';
import type { BookToEnrich, CurrentBook } from '../infrastructure/types/index.js';

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger('book-enrichment');
const dataAccess = createDataAccess(scriptDir);

async function enrichBooksWithCategories(): Promise<void> {
    const booksToEnrich = await getBooksToEnrich(dataAccess);
    
    logger.info('Pending books to enrich:', booksToEnrich.length);
    
    if (booksToEnrich.length === 0) {
        logger.info('No books need enrichment');
        return;
    }

    const browser = await createBrowser({ slowMo: 10 });
    const page = await browser.newPage();

    try {
        for (const book of booksToEnrich) {
            await enrichBookCategories(page, book);
            await saveEnrichedBooks(booksToEnrich);
        }
        
        logger.info('Book enrichment completed successfully');
    } finally {
        await browser.close();
    }
}

async function enrichBookCategories(page: Page, book: BookToEnrich): Promise<void> {
    await page.goto(book.url, { waitUntil: 'networkidle2' });
    
    const categories: string[] = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.BookPageMetadataSection__genreButton .Button__labelItem'));
        return elements.map((element: Element) => (element as HTMLElement).innerText);
    });
    
    logger.debug({ categories, title: book.title, url: book.url });
    
    if (categories.length > 0) {
        book.categories = categories;
    }
}

async function saveEnrichedBooks(enrichedBooks: BookToEnrich[]): Promise<void> {
    const currentBooks = await dataAccess.getBooks();
    const mergedBooks = mergeEnrichedBooks(currentBooks, enrichedBooks);
    
    // Ensure all books have categories property
    const booksWithCategories = mergedBooks.map((book: CurrentBook) => {
        if (!('categories' in book)) {
            (book as CurrentBook).categories = [];
        }
        return book;
    });
    
    await dataAccess.saveBooks(booksWithCategories);
}

// Run with standardized error handling
runWithErrorHandling(
    enrichBooksWithCategories,
    logger,
    "Enriching books with categories"
);