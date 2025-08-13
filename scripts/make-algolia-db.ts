/**
 * Creates a flattened database for Algolia search indexing
 * Converts threaded tweets into individual searchable entries
 */

import { getScriptDirectory, createScriptLogger, runWithErrorHandling } from './libs/common-utils.js';
import { createDataAccess } from './libs/data-access.js';
import type { Tweet, SearchIndexEntry } from '../infrastructure/types/index.js';

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger('make-algolia-db');
const dataAccess = createDataAccess(scriptDir);

async function createAlgoliaDatabase(): Promise<void> {
    const tweets = await dataAccess.getTweets();
    const searchEntries = createSearchIndexEntries(tweets);
    
    await dataAccess.saveTweetsDb(searchEntries);
    
    logger.info(`Created Algolia database with ${searchEntries.length} searchable entries`);
}

function createSearchIndexEntries(tweets: Tweet[][]): SearchIndexEntry[] {
    const searchEntries: SearchIndexEntry[] = [];
    
    tweets.forEach((thread: Tweet[]) => {
        const threadId = thread[0].id;
        const threadTime = thread[0].time;
        
        thread.forEach(({ id, tweet }: Tweet) => {
            searchEntries.push({
                id: `${threadId}-${id}`,
                tweet: tweet,
                time: threadTime
            });
        });
    });
    
    return searchEntries;
}

// Run with standardized error handling
runWithErrorHandling(
    createAlgoliaDatabase,
    logger,
    "Creating Algolia search database"
);