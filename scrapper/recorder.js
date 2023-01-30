const { writeFileSync } = require('fs');
const csvdata = require('csvdata');
const { 
    getTweetText,
    extractMetadata,
    parseStats } = require('./scraping');
/**
 * This script is used to download the tweets from a csv file into a json file.
 * It scrapes the tweets from the Twitter Website using Puppeteer and saves the
 * tweets into a json file.
 */
(async () => {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ slowMo: 150 })
    const page = await browser.newPage();

    const m = puppeteer.devices['iPhone X'];
    await page.emulate(m);

    const tweets = await csvdata.load("../db/turras.csv", { parse: false });
    console.log('Total tweets', tweets.length);
    // Start by processing only the tweets that are not already processed
    const existingTweets = require("../db/tweets.json").reduce((acc, tweets) => {
        acc.push(tweets[0].id);
        return acc;
    }, []);

    let tweetIds = tweets.map((tweet) => tweet.id).reduce((acc, id) => {
        if (existingTweets.find(_id => id === _id)) return acc;
        acc.push(id);
        return acc;
    }, []);

    console.log('Processing a total of tweets', tweetIds.length);
    /**
     * Extracts all tweets from a thread, including the original tweet, and saves them as an array into a json file.
     */
    async function getAllTweets() {
        for (const tweetId of tweetIds) {
            /**
             * Go to tweet 
            */
            await page.goto(`https://twitter.com/Recuenco/status/${tweetId}`)
            console.log("Waiting for selector");
            await page.waitForSelector('div[data-testid="tweetText"]')

            let stopped = false;
            // Holds all tweets from a particular thread
            const tweets = [];

            while (!stopped) {
                /**
                 * Wait for progress bar to disappear
                */
                await new Promise(r => setTimeout(r, 100));
                console.log("Waiting for progress bar");
                await page.waitForSelector('div[role="progressbar"]', { hidden: true });
                const currentTweetId = page.url().split("/").slice(-1).pop();
                const tweet = await page.evaluate(getTweetText);

                console.log("currentTweetId", currentTweetId);
                /**
                 * Extract metadata (card, media, etc)
                */
                const metadata = await extractMetadata(page);
                await new Promise(r => setTimeout(r, 100));
                /**
                 * Get at what time the tweet was posted
                */
                const time = await page.evaluate(() => {
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('time').dateTime;
                    return el;
                });
                /**
                 * Get views, likes, retweets, replies
                */
                const groupStats = await page.evaluate(() => {
                    const el = Array.from(document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelectorAll('span[data-testid="app-text-transition-container"]')).reduce((acc, value) => acc + value.parentElement.parentElement.innerText + "-", "")
                    return el;
                });
                const stats = parseStats(groupStats);
                console.log("tweetId", tweetId, { tweet, id: currentTweetId, metadata, time, stats });
                tweets.push({ tweet, id: currentTweetId, metadata, time, stats });
                console.log("finding lastTweetFound");
                await new Promise(r => setTimeout(r, 100));
                /**
                 * Stop thread scraping if we reach the last tweet
                */
                const lastTweetFound = await page.evaluate(() => {
                    if (document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling === null)
                        return 'finished';
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling.children[0].querySelector('div[data-testid]').querySelector("a").href;
                    return el;
                });
                console.log("lastTweetFound", lastTweetFound !== 'https://twitter.com/Recuenco');
                if (lastTweetFound !== 'https://twitter.com/Recuenco') {
                    stopped = true;
                    const existingTweets = require("../db/tweets.json");
                    existingTweets.push(tweets);
                    writeFileSync("../db/tweets.json", JSON.stringify(existingTweets));
                    continue;
                }
                /**
                 * If there are tweets left, navigate to the next one and start over
                */
                console.log("Navigating to next tweet");
                await Promise.all([
                    page.waitForSelector('div[role="progressbar"]', { hidden: true }),
                    page.evaluate(() => {
                        document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling.children[0].querySelector('article[data-testid="tweet"]').click()
                    }),
                    page.waitForNavigation()
                ]);
            }
        }
    }

    await getAllTweets();
    console.log("Estaré aquí mismo!")
    await page.close();
    process.exit(0);
})()
