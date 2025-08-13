import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../infrastructure/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize logger
const logger = createLogger({ prefix: 'add-tweet' });

if (process.argv.length < 4) {
    logger.error("Usage: node addTweet.js <tweetId> <tweetContent>");
    process.exit(1);
}

const tweetId: string = process.argv[2];
// Combine all remaining arguments to handle spaces and special characters in tweetContent
const tweetContent: string = process.argv.slice(3).join(' ');
const filePath: string = join(__dirname, '/../infrastructure/db/turras.csv');

async function addTweet(tweetId: string, tweetContent: string): Promise<void> {
    try {
        const data = await fs.readFile(filePath, { encoding: 'utf8' });

        // Escape double quotes in the tweet content
        const escapedContent = `"${tweetContent.replace(/"/g, '""')}"`;

        // Prepare the new tweet entry
        const newTweet = `${tweetId},${escapedContent},""`;

        // Split data into lines and ensure newline handling is consistent
        const lines = data.split(/\r?\n/);

        // Insert the new tweet after the header (assumed to be the first line)
        lines.splice(1, 0, newTweet);

        // Join the lines back together with a newline character
        const updatedContent = lines.join('\n');

        // Write the updated content back to the file
        await fs.writeFile(filePath, updatedContent, { encoding: 'utf8' });
        logger.info("Tweet added successfully!");
    } catch (err) {
        logger.error("Error processing the file:", err);
    }
}

addTweet(tweetId, tweetContent);