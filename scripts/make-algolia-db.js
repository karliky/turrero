/**
 * With this script, we create a new file that contains all the tweets in a single array (flatting the threads)
 * and then we can manually upload it to Algolia.
 */
import tweets from '../db/tweets.json' assert { type: 'json' };
import fs from 'fs';


import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const algoliaTweets = [];

tweets.forEach((thread) => {
    const tweetId = thread[0].id;
    thread.forEach(({ id, tweet }) => algoliaTweets.push({ id: tweetId + "-" + id, tweet: tweet, time: thread[0].time }));
});

fs.writeFileSync(__dirname + '/../db/tweets-db.json', JSON.stringify(algoliaTweets, null, 4));