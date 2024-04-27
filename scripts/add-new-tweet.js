import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv.length < 4) {
    console.log("Usage: node addTweet.js <tweetId> <tweetContent>");
    process.exit(1);
}

const tweetId = process.argv[2];
const tweetContent = process.argv[3];
const filePath = join(__dirname ,"/../db/turras.csv");

async function addTweet(tweetId, tweetContent) {
    try {
        const data = await fs.readFile(filePath, { encoding: 'utf8' });
        const escapedContent = `"${tweetContent.replace(/"/g, '""')}"`;
        const newTweet = `${tweetId},${escapedContent},""`;

        const lines = data.split('\n');
        lines.splice(1, 0, newTweet); // Insert the new tweet after the header
        const updatedContent = lines.join('\n');

        await fs.writeFile(filePath, updatedContent);
        console.log("Tweet added successfully!");
    } catch (err) {
        console.error("Error processing the file:", err);
    }
}

addTweet(tweetId, tweetContent);
