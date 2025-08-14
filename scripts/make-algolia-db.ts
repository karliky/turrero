/**
 * Creates a flattened database for Algolia search indexing
 * Converts threaded tweets into individual searchable entries
 */

import {
  createScriptLogger,
  getScriptDirectory,
  runWithErrorHandling,
} from "@/scripts/libs/common-utils.ts";
import { createDataAccess } from "@/scripts/libs/data-access.ts";
import type { SearchIndexEntry, Tweet } from "@/infrastructure/types/index.ts";

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger("make-algolia-db");
const dataAccess = createDataAccess(scriptDir);

async function createAlgoliaDatabase(): Promise<void> {
  const tweets = await dataAccess.getTweets();
  const searchEntries = createSearchIndexEntries(tweets);

  await dataAccess.saveTweetsDb(searchEntries);

  logger.info(
    `Created Algolia database with ${searchEntries.length} searchable entries`,
  );
}

function createSearchIndexEntries(tweets: Tweet[][]): SearchIndexEntry[] {
  const searchEntries: SearchIndexEntry[] = [];

  tweets.forEach((thread: Tweet[]) => {
    if (thread.length === 0) return;

    const threadId = thread[0]!.id;
    const threadTime = thread[0]!.time;

    thread.forEach(({ id, tweet }: Tweet) => {
      searchEntries.push({
        objectID: `${threadId}-${id}`,
        tweet: tweet,
        time: threadTime,
        summary: "",
        author: "",
        categories: [],
        engagement: 0,
      } as SearchIndexEntry);
    });
  });

  return searchEntries;
}

// Run with standardized error handling
runWithErrorHandling(
  createAlgoliaDatabase,
  logger,
  "Creating Algolia search database",
);
