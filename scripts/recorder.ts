import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, writeFileSync } from 'fs';
import { getTweetText, extractMetadata } from './scraping';

import puppeteer, { KnownDevices } from 'puppeteer';
import existingTweetsData from '../db/tweets.json' assert { type: 'json' };

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Tweet {
    tweet: string;
    id: string;
    metadata: any;
    time: string;
    stats: any;
}

/**
 * Parse CSV file into an array of objects.
 * @param {string} filePath Path to the CSV file.
 * @returns {Array} Array of objects where each object represents a row in the CSV.
 */
function parseCSV(filePath: string): any[] {
    const csvContent = readFileSync(filePath, { encoding: 'utf8' });
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const data = line.split(',');
        return headers.reduce((obj, nextKey, index) => {
            obj[nextKey.trim()] = data[index].replace(/(^"|"$)/g, '').trim(); // Remove surrounding quotes and trim.
            return obj;
        }, {} as any);
    });
}

// Replace csvdata.load with custom parseCSV function
const tweets = parseCSV(__dirname + "/../db/turras.csv");
const random = Math.floor(Math.random() * 150) + 750;

(async () => {
    console.log("Launching...");
    const browser = await puppeteer.launch({ slowMo: random });
    const page = await browser.newPage();

    const cookies = [
        { 'name': 'twid', 'value': process.env.twid || '', 'domain': 'twitter.com' },
        { 'name': 'auth_token', 'value': process.env.auth_token || '', 'domain': 'twitter.com' },
        { 'name': 'lang', 'value': process.env.lang || '', 'domain': 'twitter.com' },
        { 'name': 'd_prefs', 'value': process.env.d_prefs || '', 'domain': 'twitter.com' },
        { 'name': 'kdt', 'value': process.env.kdt || '', 'domain': 'twitter.com' },
        { 'name': 'ct0', 'value': process.env.ct0 || '', 'domain': 'twitter.com' },
        { 'name': 'guest_id', 'value': process.env.guest_id || '', 'domain': 'twitter.com' },
        { 'name': 'domain', 'value': "https://twitter.com/", 'domain': 'twitter.com' }
    ];

    console.log('Setting cookies');
    await page.setCookie(...cookies);

    const m = KnownDevices['iPhone 12'];
    await page.emulate(m);

    console.log('Total tweets', tweets.length);
    // Start by processing only the tweets that are not already processed
    const existingTweets = existingTweetsData.reduce((acc: string[], tweet: any) => {
        acc.push(tweet[0].id);
        return acc;
    }, []);

    const tweetIds = tweets.map((tweet: any) => tweet.id).reduce((acc: string[], id: string) => {
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
            await page.goto(`https://x.com/Recuenco/status/${tweetId}`);
            console.log("Waiting for selector");
            await page.waitForSelector('div[data-testid="tweetText"]');

            let stopped = false;
            // Holds all tweets from a particular thread
            const tweets: Tweet[] = [];

            while (!stopped) {
                /**
                 * Wait for progress bar to disappear
                */
                await new Promise(r => setTimeout(r, 100));
                console.log("Waiting for progress bar");
                await page.waitForSelector('div[role="progressbar"]', { hidden: true });
                const currentTweetId = page.url().split("/").slice(-1).pop() || '';
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
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]')?.querySelector('time')?.getAttribute('dateTime') || '';
                    return el;
                });
                /**
                 * Get views, likes, retweets, replies
                */
                const stats = await page.evaluate(() => {
                    const statsKeyMap: { [key: string]: string } = {
                        likes: "likes",
                        like: "likes",
                        views: "views",
                        view: "views",
                        replies: "replies",
                        reply: "replies",
                        reposts: "retweets",
                        repost: "retweets",
                        bookmarks: "bookmarks",
                        bookmark: "bookmarks"
                    };

                    function parseStats(text: string): { [key: string]: string } {
                        const stats: { [key: string]: string } = {};
                        const segments = text.split(',');

                        segments.forEach(segment => {
                            const match = segment.trim().match(/(\d+)\s(\w+)/);
                            if (match) {
                                const value = match[1];
                                const key = match[2];

                                if (statsKeyMap[key]) {
                                    stats[statsKeyMap[key]] = value;
                                }
                            }
                        });

                        return stats;
                    }

                    const statsLabel = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]')?.querySelector('div[role="group"]')?.getAttribute("aria-label")?.toLowerCase() || '';
                    return parseStats(statsLabel);
                });

                console.log("tweetId", tweetId, { tweet, id: currentTweetId, metadata, time, stats });
                tweets.push({ tweet, id: currentTweetId, metadata, time, stats });
                console.log("finding lastTweetFound");
                await new Promise(r => setTimeout(r, 100));
                /**
                 * Stop thread scraping if we reach the last tweet
                */
                const lastTweetFound = await page.evaluate(() => {
                    const tweetElement = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
                    const nextSibling = tweetElement?.closest('div[data-testid="cellInnerDiv"]')?.nextElementSibling?.nextElementSibling;
                    if (!nextSibling) return 'finished';
                    const el = nextSibling.querySelector('div[data-testid]')?.querySelector("a")?.href || '';
                    return el;
                });
                console.log("lastTweetFound", lastTweetFound !== 'https://x.com/Recuenco');
                if (lastTweetFound !== 'https://x.com/Recuenco') {
                    stopped = true;
                    existingTweetsData.push(tweets);
                    writeFileSync(__dirname + "/../db/tweets.json", JSON.stringify(existingTweetsData, null, 2));
                    continue;
                }
                /**
                 * If there are tweets left, navigate to the next one and start over
                */
                console.log("Navigating to next tweet");
                await Promise.all([
                    page.waitForSelector('div[role="progressbar"]', { hidden: true }),
                    page.evaluate(() => {
                        const tweetElement = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
                        tweetElement?.closest('div[data-testid="cellInnerDiv"]')?.nextElementSibling?.nextElementSibling?.querySelector('article[data-testid="tweet"]')?.click();
                    }),
                    page.waitForNavigation()
                ]);
            }
        }
    }

    await getAllTweets();
    console.log("Finished scraping tweets!");
    await browser.close();
    process.exit(0);
})();
