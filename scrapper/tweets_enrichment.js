// NODE_TLS_REJECT_UNAUTHORIZED=0
const tweetsLibrary = require("../tweets.json");
const fs = require("fs");
const Downloader = require("nodejs-file-downloader");
const { tall } = require('tall');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

fs.rmSync("./metadata", { recursive: true, force: true });
fs.rmSync("../tweets_enriched.json", { recursive: true, force: true });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const tweets = [];
(async () => {
    for (const tweetLibrary of tweetsLibrary) {
        for (const tweet of tweetLibrary) {
            if (!tweet.metadata) continue;
            const { metadata } = tweet;
            const downloader = new Downloader({
                url: metadata.img,
                directory: "./metadata",
              });
            try {
                const { filePath } = await downloader.download();
                const url = await tall(metadata.url);
                tweet.metadata.img = filePath;
                tweet.metadata.url = url;
                tweet.tweet = undefined;
                if (url.includes("youtube.com")) {
                    const response = await fetch(url);
                    const data = await response.text();
                    const $ = cheerio.load(data);
                    tweet.metadata.media = "youtube";
                    tweet.metadata.description = $('meta[name=description]').attr('content')
                    tweet.metadata.title = $('meta[name=title]').attr('content')
                }
                if (url.includes("goodreads.com")) {
                    const response = await fetch(url);
                    const data = await response.text();
                    const $ = cheerio.load(data);
                    console.log($('meta[name=description]').attr('content'))
                    tweet.metadata.media = "goodreads";
                    tweet.metadata.title = $('h1').text().trim()
                }
                console.log(tweet.metadata);
                tweets.push({ id: tweet.id, ...tweet.metadata });
            } catch (error) {
                console.log("Request failed", tweet.metadata, error.message);
                tweet.metadata.url = undefined;
            }
        }
    }
    fs.writeFileSync("../tweets_enriched.json", JSON.stringify(tweets));
})()