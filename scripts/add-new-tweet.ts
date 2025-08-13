import {
  getScriptDirectory,
  getDbFilePath,
  createScriptLogger,
  validateArgs,
  extractTweetId,
  extractTweetContent,
  escapeCsvContent,
  formatCsvRow,
  runWithErrorHandling,
  readCsvFile,
  writeCsvFile
} from './libs/common-utils.js';

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger('add-tweet');

// Validate command line arguments
validateArgs(process.argv, 4, "node add-new-tweet.ts <tweetId> <tweetContent>");

const tweetId = extractTweetId(process.argv);
const tweetContent = extractTweetContent(process.argv);
const filePath = getDbFilePath(scriptDir, 'turras.csv');

async function addTweet(tweetId: string, tweetContent: string): Promise<void> {
    const data = await readCsvFile(filePath);
    
    // Prepare the new tweet entry
    const escapedContent = escapeCsvContent(tweetContent);
    const newTweet = formatCsvRow([tweetId, escapedContent, '""']);
    
    // Split data into lines and ensure newline handling is consistent
    const lines = data.split(/\r?\n/);
    
    // Insert the new tweet after the header (assumed to be the first line)
    lines.splice(1, 0, newTweet);
    
    // Join the lines back together and write
    const updatedContent = lines.join('\n');
    await writeCsvFile(filePath, updatedContent);
    
    logger.info("Tweet added successfully!");
}

// Run with standardized error handling
runWithErrorHandling(
    () => addTweet(tweetId, tweetContent),
    logger,
    "Adding tweet to CSV"
);