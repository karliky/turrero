const enrichments = require('../db/tweets_enriched.json');
const tweets = require('../db/tweets.json');
const fs = require('fs');

// "id": "1610940583975047168",
// "type": "card",
// "img": "./metadata/YkCt4imh.jpeg",
// "url": "https://www.goodreads.com/book/show/51873030-mediocracia",
// "media": "goodreads",
// "title": "Mediocracia: Cuando los mediocres toman el poder"

const fromGoodReads = enrichments.filter((e) => e.media === 'goodreads').map((book) => {
    const tweet = tweets.find((t) => t.find((tt) => tt.id === book.id))[0];
    return { ...book, turraId: tweet.id };
});
console.log("Total books fromGoodReads", fromGoodReads.length);

const books = [...fromGoodReads];
fs.writeFileSync('../db/books-not-enriched.json', JSON.stringify(books, null, 2));