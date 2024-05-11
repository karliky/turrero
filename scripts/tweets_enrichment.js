// NODE_TLS_REJECT_UNAUTHORIZED=0
import Downloader from 'nodejs-file-downloader';
import { writeFileSync } from 'fs';
import { tall } from 'tall';
import enrichments from '../db/tweets_enriched.json' assert { type: 'json' };
import existingTweets from '../db/tweets_enriched.json' assert { type: 'json' };
import tweetsLibrary from '../db/tweets.json' assert { type: 'json' };
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

// We need to set this to avoid SSL errors when downloading images
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

(async () => {
    const browser = await puppeteer.launch({ slowMo: 200 });
    const page = await browser.newPage();

    const processKnownDomain = async (tweet, url) => {
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
        if (url.includes("wikipedia.org")) {
            const response = await fetch(url);
            const data = await response.text();
            const $ = cheerio.load(data);
            tweet.metadata.media = "wikipedia";
            tweet.metadata.title = $('h1').text().trim();
            tweet.metadata.description = Array.from($("div[id=mw-content-text] p")).slice(0, 2).map(el => $(el).text()).join("").trim()
            // Prevent ban from Wikipedia servers
            await new Promise(r => setTimeout(r, 1000));
        }
        if (url.includes("linkedin.com")) {
            const response = await fetch(url);
            const data = await response.text();
            const $ = cheerio.load(data);
            tweet.metadata.media = "linkedin";
            tweet.metadata.title = $('h1').text().trim();
            tweet.metadata.description = $('meta[name=description]').attr('content');
        }
    }

    const downloadTweetMedia = async (tweet) => {
        if (!tweet.metadata.img) {
            const url = await tall(tweet.metadata.url);
            tweet.metadata.url = url;
            await processKnownDomain(tweet, url);
            saveTweet(tweet);
            return;
        }
        const downloader = new Downloader({
            url: tweet.metadata.img,
            directory: "./metadata",
        });
        const { filePath } = await downloader.download();
        if (!tweet.metadata.url) {
            delete tweet.metadata.embed;
            tweet.metadata.img = filePath;
            tweet.metadata.type = "media";
            saveTweet(tweet);
            return;
        }
        const url = await tall(tweet.metadata.url);
        tweet.metadata.img = filePath;
        tweet.metadata.url = url;
        tweet.tweet = undefined;
        await processKnownDomain(tweet, url);
        saveTweet(tweet);
    };

    for (const tweetLibrary of tweetsLibrary) {
        for (const tweet of tweetLibrary) {
            if (!tweet.metadata) continue;
            const { embed } = tweet.metadata;
            if (enrichments.find(_tweet => tweet.id === _tweet.id || (embed && embed.id === _tweet.id))) {
                continue;
            }
            if (embed) {
                console.log({ type: "embeddedTweet", embeddedTweetId: embed.id, ...embed, id: tweet.id, });
                
                existingTweets.push({ type: "embeddedTweet", embeddedTweetId: embed.id, ...embed, id: tweet.id, });
                writeFileSync("./db/tweets_enriched.json", JSON.stringify(existingTweets));
            }
            if (!tweet.metadata.type) continue;
            try {
                if (tweet.metadata.type === "card") {
                    await downloadTweetMedia(tweet);
                    continue;
                }
                await Promise.all(tweet.metadata.imgs.map(async metadata => {
                    metadata.type = "media";
                    await downloadTweetMedia({ id: tweet.id, metadata });
                }));
            } catch (error) {
                console.log("Request failed", tweet.id, tweet.metadata, error.message);
                tweet.metadata.url = undefined;
            }
        }
    }
    console.log("Finished!");
    process.exit(0);
})()

function saveTweet(tweet) {
    console.log({ id: tweet.id, ...tweet.metadata });
    delete tweet.metadata.embed;
    existingTweets.push({ id: tweet.id, ...tweet.metadata });
    writeFileSync("./db/tweets_enriched.json", JSON.stringify(existingTweets));
}
