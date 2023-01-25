// NODE_TLS_REJECT_UNAUTHORIZED=0
const tweetsLibrary = require("../tweets.json");
const { writeFileSync, rmSync }  = require("fs");
const Downloader = require("nodejs-file-downloader");
const { tall } = require('tall');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const enrichments = require("../tweets_enriched.json");
const puppeteer = require('puppeteer');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

(async () => {
    const browser = await puppeteer.launch({ slowMo: 200 });
    const page = await browser.newPage();

    for (const tweetLibrary of tweetsLibrary) {
        for (const tweet of tweetLibrary) {
            if (!tweet.metadata) continue;
            if(enrichments.find(_tweet => tweet.id === _tweet.id)) {
                console.log("Tweet already processed", tweet.id);
                continue;
            }
            if (tweet.metadata.type === "embeddedTweet") {
                console.log({ id: tweet.id, type: "embeddedTweet", embeddedTweetId: tweet.metadata.id });
                const existingTweets = require("../tweets_enriched.json");
                existingTweets.push({ id: tweet.id, type: "embeddedTweet", embeddedTweetId: tweet.metadata.id });
                writeFileSync("../tweets_enriched.json", JSON.stringify(existingTweets));
                continue;
            }
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
                    tweet.metadata.description = $('meta[name=description]').attr('content');
                    tweet.metadata.title = $('meta[name=title]').attr('content');
                }
                if (url.includes("goodreads.com") && !url.includes("user_challenges")) {
                    await Promise.all([page.goto(url), page.waitForNavigation(), page.waitForSelector('h1')]);
                    const title = await page.evaluate(() => document.querySelector('h1').textContent);
                    tweet.metadata.media = "goodreads";
                    tweet.metadata.title = title;
                }
                if (url.includes("linkedin.com")) {
                    const response = await fetch(url);
                    const data = await response.text();
                    const $ = cheerio.load(data);
                    tweet.metadata.media = "linkedin";
                    tweet.metadata.title = $('h1').text().trim();
                    tweet.metadata.description = $('meta[name=description]').attr('content');
                }
                console.log({ id: tweet.id, ...tweet.metadata });
                const existingTweets = require("../tweets_enriched.json");
                existingTweets.push({ id: tweet.id, ...tweet.metadata });
                writeFileSync("../tweets_enriched.json", JSON.stringify(existingTweets));
            } catch (error) {
                console.log("Request failed", tweet.metadata, error.message);
                tweet.metadata.url = undefined;
            }
        }
    }
    console.log("Finished!");
    process.exit(0);
})()