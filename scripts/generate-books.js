import enrichments from '../db/tweets_enriched.json' assert { type: 'json' };
import tweets from '../db/tweets.json' assert { type: 'json' };
import fs from 'fs';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fromGoodReads = enrichments.filter((e) => e.media === 'goodreads').map((book) => {
    const tweet = tweets.find((t) => t.find((tt) => tt.id === book.id))[0];
    return { ...book, turraId: tweet.id };
});
console.log("Total books fromGoodReads", fromGoodReads.length);

const books = [...fromGoodReads].filter((book) => book.url.indexOf('/author/') === -1);

fs.writeFileSync(__dirname + '/../db/books-not-enriched.json', JSON.stringify(books, null, 2));