import dotenv from 'dotenv';
dotenv.config();

import { writeFileSync } from 'fs';
import csvdata from 'csvdata';
import { getTweetText, extractMetadata } from './scraping.js';

import puppeteer from 'puppeteer';
import {KnownDevices} from 'puppeteer';
import existingTweetsData from '../db/tweets.json' assert { type: 'json' };

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tweets = await csvdata.load(__dirname + "/../db/turras.csv", { parse: false });

/**
 * This script is used to download the tweets from a csv file into a json file.
 * It scrapes the tweets from the Twitter Website using Puppeteer and saves the
 * tweets into a json file.
 */
// Slow down the script to avoid getting banned
const random = Math.floor(Math.random() * 150) + 750;

(async () => {
    console.log("Launching...");
    const browser = await puppeteer.launch({ slowMo: random, headless:true})
    const page = await browser.newPage();

    await Promise.all([
        page.goto('https://twitter.com/login'),
        page.waitForNavigation()
    ]);

    const cookies = [
        { 'name': 'twid', 'value': process.env.twid },
        { 'name': 'auth_token', 'value': process.env.auth_token },
        { 'name': 'lang', 'value': process.env.lang },
        { 'name': 'kdt', 'value': process.env.kdt },
        { 'name': 'ct0', 'value': process.env.ct0 },
        { 'name': 'guest_id', 'value': process.env.guest_id },
        { 'name': 'domain', 'value': "https://twitter.com/" },
    ];

    console.log('Setting cookies');	
    await page.setCookie(...cookies);
    
    const m = KnownDevices['iPhone 12'];
    await page.emulate(m);

    
    console.log('Total tweets', tweets.length);
    // Start by processing only the tweets that are not already processed
    const existingTweets = existingTweetsData.reduce((acc, tweets) => {
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
                const stats = await page.evaluate(() => {
                    const stats_map = {
                        like: "likes",
                        views: "views",
                        reply: "replies",
                        retweet: "retweets",
                        retweets: "retweets",
                        bookmark: "bookmarks"
                    };
                    return Array.from(document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelectorAll('span[data-testid="app-text-transition-container"]')).map(el => {
                        if (el.parentElement?.nextElementSibling?.tagName === "SPAN") {
                            return {
                                [stats_map[el.parentElement?.nextElementSibling?.innerText.toLowerCase()]]: el.innerText
                            }
                        }
                        return {
                            [stats_map[el.closest("div[data-testid]").getAttribute("data-testid").toLowerCase()]]: el.innerText
                        }
                    }).reduce((acc, el) => {
                        const keys = Object.keys(el);
                        acc[keys[0]] = el[keys[0]]
                        return acc;
                    }, {});
                });
                console.log("tweetId", tweetId, { tweet, id: currentTweetId, metadata, time, stats });
                tweets.push({ tweet, id: currentTweetId, metadata, time, stats });
                console.log("finding lastTweetFound");
                await new Promise(r => setTimeout(r, 100));
                /**
                 * Stop thread scraping if we reach the last tweet
                */
                const lastTweetFound = await page.evaluate(() => {
                    if (document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').closest('div[data-testid="cellInnerDiv"]').nextElementSibling.nextElementSibling === null) return 'finished';
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').closest('div[data-testid="cellInnerDiv"]').nextElementSibling.nextElementSibling.querySelector('div[data-testid]').querySelector("a").href;
                    return el;
                });
                console.log("lastTweetFound", lastTweetFound !== 'https://twitter.com/Recuenco');
                if (lastTweetFound !== 'https://twitter.com/Recuenco') {
                    stopped = true;
                    //const existingTweets = require(__dirname + "/../db/tweets.json");
                    existingTweetsData.push(tweets);
                    writeFileSync(__dirname + "/../db/tweets.json", JSON.stringify(existingTweetsData));
                    continue;
                }
                /**
                 * If there are tweets left, navigate to the next one and start over
                */
                console.log("Navigating to next tweet");
                await Promise.all([
                    page.waitForSelector('div[role="progressbar"]', { hidden: true }),
                    page.evaluate(() => {
                        document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').closest('div[data-testid="cellInnerDiv"]').nextElementSibling.nextElementSibling.querySelector('article[data-testid="tweet"]').click()
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
