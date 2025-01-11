import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, writeFileSync } from 'fs';
import { getTweetText, extractMetadata } from './scraping.js';

import puppeteer from 'puppeteer';
import { KnownDevices } from 'puppeteer';
import existingTweetsData from '../infrastructure/db/tweets.json' assert { type: 'json' };

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
const tweets = parseCSV(__dirname + '/../infrastructure/db/turras.csv');
const random = Math.floor(Math.random() * 150) + 750;

async function parseTweet({ page }) {
    /**
     * Wait for progress bar to disappear
    */
    await new Promise(r => setTimeout(r, 100));
    console.log("Waiting for progress bar");
    await page.waitForSelector('div[role="progressbar"]', { hidden: true });

    const currentTweetId = page.url().split("/").slice(-1).pop();
    console.log("currentTweetId", currentTweetId);
    const tweet = await page.evaluate(getTweetText); // text
    const metadata = await extractMetadata(page); // media
    await new Promise(r => setTimeout(r, 100));
    // Get at what time the tweet was posted
    const time = await page.evaluate(() => {
        const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('time').dateTime;
        return el;
    });
    // Get views, likes, retweets, replies
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
        return parseStats(statsLabel);
    });
    /* This workaround is to prevent a bug for the next situation:

       when a tweet has no text (only media) and it has an embedded, the parser may actually
       identify as tweet text the text of the embedding and it is not trully fixable with
       just text selectors as they have random names and attributes.
    */
    const actualTweet = (tweet == metadata?.embed?.tweet) ? "" : tweet;
    return { tweet: actualTweet, id: currentTweetId, metadata, time, stats };
}

async function getAllTweets({ page, tweetIds, outputFilePath }) {
    for (const tweetId of tweetIds) {
        await page.goto(`https://x.com/Recuenco/status/${tweetId}`);
        console.log("Waiting for selector");
        await page.waitForSelector('div[data-testid="tweetText"]');
        // Refuse cookies and close the popup, only the first time it happens, afterwards it should be ignored
        try {
            await rejectCookies(page)
        } catch (error) { }

        let stopped = false;
        const tweets = [];

        while (!stopped) {
            const { tweet, shouldStop } = await fetchSingleTweet(page);
            tweets.push(tweet);
            console.log("finding lastTweetFound");


            if (shouldStop) {
                stopped = true;
                existingTweetsData.push(tweets);
                writeFileSync(outputFilePath, JSON.stringify(existingTweetsData, null, 4));
                continue;
            }

            // If there are tweets left, navigate to the next one and start over

            console.log("Navigating to next tweet");
            await Promise.all([
                page.waitForSelector('div[role="progressbar"]', { hidden: true }),
                page.evaluate(() => {
                    document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').closest('div[data-testid="cellInnerDiv"]').nextElementSibling.nextElementSibling.querySelector('article[data-testid="tweet"]').click();
                }),
                page.waitForNavigation()
            ]);
        }
    }
}

async function fetchSingleTweet(page) {

    const tweet = await parseTweet({ page });
    console.log("Fetched tweet data:", tweet);
    await new Promise(r => setTimeout(r, 100));
    /**
     * Stop thread scraping if we reach the last tweet
    */
    const lastTweetFound = await page.evaluate(() => {
        if (document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').closest('div[data-testid="cellInnerDiv"]').nextElementSibling.nextElementSibling === null) return 'finished';
        const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').closest('div[data-testid="cellInnerDiv"]').nextElementSibling.nextElementSibling.querySelector('div[data-testid]').querySelector("a").href;
        return el;
    });

    const shouldStop = lastTweetFound !== 'https://x.com/Recuenco';
    console.log("lastTweetFound", shouldStop);
    return { tweet, shouldStop };
}

async function rejectCookies(page) {
    // Close the popup using parentElement traversal
    await page.evaluate(() => {
        const cookieButton = Array.from(document.querySelectorAll('span'))
            .find(el => el.textContent.includes('Welcome to x.com!'));
        if (cookieButton) {
            const closeButton = cookieButton
                .parentElement.parentElement.parentElement.parentElement
                .querySelector('button');
            if (closeButton) {
                closeButton.click();
            }
        }
    });

    // Refuse non-essential cookies
    await page.evaluate(() => {
        const cookieButton = Array.from(document.querySelectorAll('span'))
            .find(el => el.textContent.includes('Refuse non-essential cookies'));
        if (cookieButton) {
            cookieButton.click();
        }
    });
}

(async () => {
    const args = process.argv.slice(2);
    const testIndex = args.indexOf('--test');
    const testMode = testIndex !== -1;
    var browserProps = {}

    if (testMode) {
        console.log("Launching. test mode..");
        browserProps = {
            headless: false,
            slowMo: 50 // Slows down Puppeteer actions by only 50ms,
        };
    } else {
        console.log("Launching..");
        browserProps = { slowMo: random };
    }
    const browser = await puppeteer.launch(browserProps);
    const page = await browser.newPage();

    const cookies = [
        { 'name': 'twid', 'value': process.env.twid, 'domain': 'twitter.com' },
        { 'name': 'auth_token', 'value': process.env.auth_token, 'domain': 'twitter.com' },
        { 'name': 'lang', 'value': process.env.lang, 'domain': 'twitter.com' },
        { 'name': 'd_prefs', 'value': process.env.d_prefs, 'domain': 'twitter.com' },
        { 'name': 'kdt', 'value': process.env.kdt, 'domain': 'twitter.com' },
        { 'name': 'ct0', 'value': process.env.ct0, 'domain': 'twitter.com' },
        { 'name': 'guest_id', 'value': process.env.guest_id, 'domain': 'twitter.com' },
        { 'name': 'domain', 'value': "https://twitter.com/", 'domain': 'twitter.com' }
    ];

    console.log('Setting cookies');
    await page.setCookie(...cookies);

    const m = KnownDevices['iPhone 12'];
    await page.emulate(m);

    if (testMode) {
        const tweetId = args[testIndex + 1];
        if (!tweetId) {
            console.error("Please provide a tweet ID after --test");
            process.exit(1);
        }
        await page.goto(`https://x.com/Recuenco/status/${tweetId}`);
        console.log("Waiting for selector");
        await page.waitForSelector('div[data-testid="tweetText"]');
        // Refuse cookies and close the popup
        try {
            await rejectCookies(page)
            console.log("Cookies rejected, closed the popup");
        } catch (error) {
            console.log("I could not reject cookies and close the popup");
        }
        console.log(`Fetching tweet ${tweetId}`);

        // Add this line before the code you want to inspect on the browser console
        //debugger;
        await fetchSingleTweet(page);
        console.log("Correct exit");
    } else {

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
        await getAllTweets({
            page,
            tweetIds,
            outputFilePath: __dirname + '/../infrastructure/db/tweets.json'
        });
    }

    console.log("Estaré aquí mismo!");
    await page.close();
    await browser.close();
    process.exit(0);

})();

// Usage Examples:
// Type: `node ./scripts/recorder.js` to run the full functionality.
// Type: `node ./scripts/recorder.js --test 1867841814809461115` to fetch and parse a single tweet without modifying the environment.
