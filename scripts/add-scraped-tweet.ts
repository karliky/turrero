/**
 * Add scraped tweet content to turras.csv after scraping is complete
 * This script extracts the first tweet content from the scraped tweets.json
 * and adds it to turras.csv for the given tweet ID
 */

import {
  createScriptLogger,
  getScriptDirectory,
  getDbFilePath,
  readCsvFile,
  writeCsvFile,
  readJsonFile,
  escapeCsvContent,
  formatCsvRow,
  runWithErrorHandling,
  validateArgs,
} from "./libs/common-utils.ts";
import type { Tweet } from "../infrastructure/types/index.ts";

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger("add-scraped-tweet");

// Validate command line arguments
validateArgs(Deno.args, 1, "deno run add-scraped-tweet.ts <tweetId>");

const tweetId = Deno.args[0];
if (!tweetId || !/^\d+$/.test(tweetId)) {
  logger.error('Invalid tweet ID. Must be a numeric string.');
  Deno.exit(1);
}

const csvFilePath = getDbFilePath(scriptDir, "turras.csv");
const tweetsFilePath = getDbFilePath(scriptDir, "tweets.json");

async function addScrapedTweetToCsv(tweetId: string): Promise<void> {
  // Read the scraped tweets data
  const tweetsData = await readJsonFile<Tweet[][]>(tweetsFilePath);
  
  // Find the thread containing our tweet ID
  let firstTweetContent = "";
  for (const thread of tweetsData) {
    if (thread && thread.length > 0) {
      const firstTweet = thread[0];
      if (firstTweet && firstTweet.id === tweetId) {
        firstTweetContent = firstTweet.tweet;
        logger.info(`Found tweet content: ${firstTweetContent.slice(0, 100)}...`);
        break;
      }
    }
  }
  
  if (!firstTweetContent) {
    logger.error(`Tweet with ID ${tweetId} not found in scraped data`);
    Deno.exit(1);
  }
  
  // Read current CSV data
  const csvData = await readCsvFile(csvFilePath);
  const lines = csvData.split(/\r?\n/);
  
  // Check if the tweet ID already exists
  const existingLineIndex = lines.findIndex(line => 
    line.startsWith(tweetId + ',') || line.startsWith('"' + tweetId + '"')
  );
  
  if (existingLineIndex !== -1) {
    // Update existing entry
    const escapedContent = escapeCsvContent(firstTweetContent);
    const newLine = formatCsvRow([tweetId, escapedContent, '""']);
    lines[existingLineIndex] = newLine;
    logger.info(`Updated existing tweet entry for ID: ${tweetId}`);
  } else {
    // Add new entry after header
    const escapedContent = escapeCsvContent(firstTweetContent);
    const newLine = formatCsvRow([tweetId, escapedContent, '""']);
    lines.splice(1, 0, newLine);
    logger.info(`Added new tweet entry for ID: ${tweetId}`);
  }
  
  // Write back to CSV
  const updatedContent = lines.join("\n");
  await writeCsvFile(csvFilePath, updatedContent);
  
  logger.info("Successfully updated turras.csv with scraped content");
}

// Run with standardized error handling
runWithErrorHandling(
  () => addScrapedTweetToCsv(tweetId),
  logger,
  "Adding scraped tweet to CSV",
);