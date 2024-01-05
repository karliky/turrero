const enrichments = require('../db/tweets_enriched.json');
const fs = require('fs');

// "id": "1610940583975047168",
// "type": "card",
// "img": "./metadata/YkCt4imh.jpeg",
// "url": "https://www.goodreads.com/book/show/51873030-mediocracia",
// "media": "goodreads",
// "title": "Mediocracia: Cuando los mediocres toman el poder"

const fromGoodReads = enrichments.filter((e) => e.media === 'goodreads');
console.log("Total books fromGoodReads", fromGoodReads.length);

const books = [...fromGoodReads ];
fs.writeFileSync('../db/books-not-enriched.json', JSON.stringify(books, null, 2));