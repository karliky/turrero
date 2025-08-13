/**
 * With this script, we create a new file that contains all the tweets in a single array (flatting the threads)
 * and then we can manually upload it to Algolia.
 */
import tweets from '../infrastructure/db/tweets.json' with { type: 'json' };
import fs from 'node:fs';

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Tweet, SearchIndexEntry } from '../infrastructure/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const algoliaTweets: SearchIndexEntry[] = [];

tweets.forEach((thread: Tweet[]) => {
    const tweetId: string = thread[0].id;
    thread.forEach(({ id, tweet }: Tweet) => algoliaTweets.push({ id: tweetId + "-" + id, tweet: tweet, time: thread[0].time }));
});

fs.writeFileSync(__dirname + '/../infrastructure/db/tweets-db.json', JSON.stringify(algoliaTweets, null, 4));