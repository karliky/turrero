import type { Page } from 'puppeteer';
import {
    getScriptDirectory,
    createScriptLogger,
    createBrowser,
    runWithErrorHandling
} from './libs/common-utils.ts';
import {
    createDataAccess,
    getBooksToEnrich,
    mergeEnrichedBooks
} from './libs/data-access.ts';
import type { BookToEnrich, CurrentBook } from '../infrastructure/types/index.ts';
import { mapToFrontendCategories } from './libs/category-mapper.ts';

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger('book-enrichment');
const dataAccess = createDataAccess(scriptDir);

async function enrichBooksWithCategories(): Promise<void> {
    const booksToEnrich = await getBooksToEnrich(dataAccess);

    logger.info('Pending books to enrich:', booksToEnrich.length);

    if (booksToEnrich.length > 0) {
        const browser = await createBrowser({ slowMo: 10 });
        const page = await browser.newPage();

        // Set desktop user agent and viewport to get full HTML
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        try {
            for (const book of booksToEnrich) {
                await enrichBookCategories(page, book);
            }
            logger.info('Goodreads scraping completed for new books');
        } finally {
            await browser.close();
        }
    } else {
        logger.info('No new books need Goodreads enrichment');
    }

    // Always remap categories for ALL books (new + existing)
    await remapAllBookCategories(booksToEnrich);
    logger.info('Book enrichment completed successfully');
}

async function enrichBookCategories(page: Page, book: BookToEnrich): Promise<void> {
    if (!book.url) {
        logger.warn(`No URL for book: ${book.title}`);
        return;
    }
    await page.goto(book.url, { waitUntil: 'networkidle2' });

    // Debug: Check what HTML we're getting
    const hasGenresSection = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="genresList"]');
        if (!container) {
            // Log available data-testid attributes for debugging
            const testIds = Array.from(document.querySelectorAll('[data-testid]'))
                .map(el => el.getAttribute('data-testid'));
            return { found: false, availableTestIds: testIds.slice(0, 10) };
        }
        return { found: true };
    });

    if (!hasGenresSection.found) {
        logger.warn(`Genres section not found for: ${book.title}`);
        logger.debug('Available test IDs:', JSON.stringify(hasGenresSection));
        return;
    }

    const categories: string[] = await page.evaluate(() => {
        // Use data-testid to find genres container first
        const genresContainer = document.querySelector('[data-testid="genresList"]');
        if (!genresContainer) return [];

        // Then find all genre labels within it
        const elements = Array.from(genresContainer.querySelectorAll('.BookPageMetadataSection__genreButton .Button__labelItem'));
        return elements.map((element: Element) => (element as HTMLElement).innerText);
    });
    
    logger.debug(
        `Book: ${book.title} | Categories: ${categories.join(', ') || 'none'} | URL: ${book.url}`
    );
    
    if (categories.length > 0) {
        book.goodreadsCategories = categories;
        book.categories = mapToFrontendCategories(categories);
    }
}

async function remapAllBookCategories(enrichedBooks: BookToEnrich[]): Promise<void> {
    const currentBooks = await dataAccess.getBooks();
    const mergedBooks = mergeEnrichedBooks(currentBooks, enrichedBooks);

    // Ensure all books have categories and apply frontend mapping
    const booksWithCategories = mergedBooks.map((book: CurrentBook) => {
        // If book has goodreadsCategories, re-derive frontend categories from them
        if (book.goodreadsCategories && book.goodreadsCategories.length > 0) {
            book.categories = mapToFrontendCategories(book.goodreadsCategories);
        } else if (book.categories && book.categories.length > 0) {
            // Legacy books without goodreadsCategories: treat existing categories
            // as Goodreads tags, save them, and map to frontend
            book.goodreadsCategories = [...book.categories];
            book.categories = mapToFrontendCategories(book.goodreadsCategories);
        } else {
            book.categories = [];
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