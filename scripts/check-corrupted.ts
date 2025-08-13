import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Tweet } from '../infrastructure/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the JSON file
const filePath = path.join(__dirname, "../infrastructure/db/tweets.json");
const tweets: Tweet[][] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

interface MissingIdItem {
    threadIndex: number;
    tweetIndex: number;
    tweet: any;
}

// Function to find objects missing the 'id' field
function findMissingIds(data: Tweet[][]): MissingIdItem[] {
    let missingIds: MissingIdItem[] = [];
    data.forEach((thread, threadIndex) => {
        thread.forEach((tweet, tweetIndex) => {
            if (!tweet.id) {
                missingIds.push({
                    threadIndex,
                    tweetIndex,
                    tweet
                });
            }
        });
    });
    return missingIds;
}

const missingIds = findMissingIds(tweets);

if (missingIds.length > 0) {
    console.log("Objects missing 'id':");
    missingIds.forEach(({ threadIndex, tweetIndex, tweet }) => {
        console.log(`Thread ${threadIndex}, Tweet ${tweetIndex}:`, tweet);
    });
} else {
    console.log("No objects are missing the 'id' field.");
}