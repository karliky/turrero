import enrichments from '../infrastructure/db/tweets_enriched.json' with { type: 'json' };
import tweets from '../infrastructure/db/tweets.json' with { type: 'json' };
import fs from 'fs';
import { createLogger } from '../infrastructure/logger.js';

import { fileURLToPath } from 'url';
import path from 'path';
import type { Tweet, EnrichmentResult } from '../infrastructure/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
const logger = createLogger({ prefix: 'generate-books' });

interface BookWithTurraId extends EnrichmentResult {
    turraId: string;
}

const fromGoodReads: BookWithTurraId[] = enrichments.filter((e: EnrichmentResult) => e.media === 'goodreads').map((book: EnrichmentResult) => {
    const tweet = tweets.find((t: Tweet[]) => t.find((tt: Tweet) => tt.id === book.id))?.[0];
    return { ...book, turraId: tweet?.id || "" };
});
logger.info("Total books fromGoodReads", fromGoodReads.length);

const books: BookWithTurraId[] = [...fromGoodReads].filter((book: BookWithTurraId) => book.url.indexOf('/author/') === -1);

fs.writeFileSync(__dirname + '/../infrastructure/db/books-not-enriched.json', JSON.stringify(books, null, 4));