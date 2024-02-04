const enrichments = require('../db/tweets_enriched.json');
const tweets = require('../db/tweets.json');
const fs = require('fs');

const fromGoodReads = enrichments.filter((e) => e.media === 'goodreads').map((book) => {
    const tweet = tweets.find((t) => t.find((tt) => tt.id === book.id))[0];
    return { ...book, turraId: tweet.id };
});
console.log("Total books fromGoodReads", fromGoodReads.length);

const books = [...fromGoodReads].filter((book) => book.url.indexOf('/author/') === -1);

fs.writeFileSync('../db/books-not-enriched.json', JSON.stringify(books, null, 2));