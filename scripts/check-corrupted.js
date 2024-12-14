import fs from 'fs';
import path from 'path';

// Load the JSON file
const filePath = path.join("db/tweets.json");
const tweets = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// Function to find objects missing the 'id' field
function findMissingIds(data) {
    let missingIds = [];
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
