import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, writeFileSync } from 'fs';
import { getTweetText, extractMetadata } from './scraping.js';

import puppeteer from 'puppeteer';
import { KnownDevices } from 'puppeteer';
import existingTweetsData from '../db/tweets.json' assert { type: 'json' };

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



/**
 * Parse CSV file into an array of objects.
 * @param {string} filePath Path to the CSV file.
 * @returns {Array} Array of objects where each object represents a row in the CSV.
 */
function parseCSV(filePath) {
    const csvContent = readFileSync(filePath, { encoding: 'utf8' });
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const data = line.split(',');
        return headers.reduce((obj, nextKey, index) => {
            obj[nextKey.trim()] = data[index].replace(/(^"|"$)/g, '').trim(); // Remove surrounding quotes and trim.
            return obj;
        }, {});
    });
}

// Replace csvdata.load with custom parseCSV function
const tweets = parseCSV(__dirname + "/../db/turras.csv");
const random = Math.floor(Math.random() * 150) + 750;

(async () => {
    console.log("Launching...");
    const browser = await puppeteer.launch({ slowMo: random})
    const page = await browser.newPage();


    const cookies = [
        { 'name': 'twid', 'value': process.env.twid, 'domain': 'twitter.com' },
        { 'name': 'auth_token', 'value': process.env.auth_token, 'domain': 'twitter.com'  },
        { 'name': 'lang', 'value': process.env.lang, 'domain': 'twitter.com'  },
        { 'name': 'd_prefs', 'value': process.env.d_prefs, 'domain': 'twitter.com'  },
        { 'name': 'kdt', 'value': process.env.kdt, 'domain': 'twitter.com'  },
        { 'name': 'ct0', 'value': process.env.ct0, 'domain': 'twitter.com'  },
        { 'name': 'guest_id', 'value': process.env.guest_id, 'domain': 'twitter.com'  },
        { 'name': 'domain', 'value': "https://twitter.com/", 'domain': 'twitter.com'  }
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
            await page.goto(`https://x.com/Recuenco/status/${tweetId}`)
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
                    
                    const statsKeyMap = {
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
                    
                    function parseStats(text) {
                        const stats = {};
                        // Dividir la cadena de texto en segmentos basados en comas
                        const segments = text.split(',');
                    
                        segments.forEach(segment => {
                            // Extraer el número y la clave de cada segmento
                            const match = segment.trim().match(/(\d+)\s(\w+)/);
                            if (match) {
                                const value = match[1];
                                const key = match[2];
                    
                                // Usar el mapa de claves para convertir la palabra clave a la propiedad del objeto
                                if (statsKeyMap[key]) {
                                    stats[statsKeyMap[key]] = value;
                                }
                            }
                        });
                    
                        return stats;
                    }

                    const statsLabel = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[role="group"]').getAttribute("aria-label").toLowerCase();
                    const stats_map = parseStats(statsLabel);
                    return stats_map;
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
                console.log("lastTweetFound", lastTweetFound !== 'https://x.com/Recuenco');
                if (lastTweetFound !== 'https://x.com/Recuenco') {
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
