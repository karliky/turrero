import { getScriptDirectory, createScriptLogger, runWithErrorHandling } from './libs/common-utils.js';
import { createDataAccess, getBooksFromGoodReads } from './libs/data-access.js';
import type { EnrichmentResult } from '../infrastructure/types/index.js';

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger('generate-books');
const dataAccess = createDataAccess(scriptDir);

interface BookWithTurraId extends EnrichmentResult {
    turraId: string;
}

async function generateBooks(): Promise<void> {
    const books = await getBooksFromGoodReads(dataAccess) as BookWithTurraId[];
    
    logger.info("Total books from GoodReads", books.length);
    
    // Filter out author pages
    const filteredBooks = books.filter((book: BookWithTurraId) => 
        book.url.indexOf('/author/') === -1
    );
    
    await dataAccess.saveBooksNotEnriched(filteredBooks);
    logger.info("Books generation completed successfully!");
}

// Run with standardized error handling
runWithErrorHandling(
    generateBooks,
    logger,
    "Generating books from enrichments"
);