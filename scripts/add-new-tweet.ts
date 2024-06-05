import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv.length < 4) {
    console.log("Usage: npx deno add-new-tweet.ts <tweetId> <tweetContent>");
    process.exit(1);
}

const tweetId: string = process.argv[2];
const tweetContent: string = process.argv[3];
const filePath: string = join(__dirname, "/../db/turras.csv");

async function addTweet(tweetId: string, tweetContent: string): Promise<void> {
    try {
        const data: string = await fs.readFile(filePath, { encoding: 'utf8' });
        const escapedContent: string = `"${tweetContent.replace(/"/g, '""')}"`;
        const newTweet: string = `${tweetId},${escapedContent},""`;

        const lines: string[] = data.split('\n');
        lines.splice(1, 0, newTweet); // Insert the new tweet after the header
        const updatedContent: string = lines.join('\n');

        await fs.writeFile(filePath, updatedContent);
        console.log("Tweet added successfully!");
    } catch (err) {
        console.error("Error processing the file:", err);
    }
}

addTweet(tweetId, tweetContent);
