const { writeFileSync } = require('fs');
const csvdata = require('csvdata');

(async () => {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ })
    const page = await browser.newPage()

    const m = puppeteer.devices['iPhone X']
    await page.emulate(m)

    const tweets = await csvdata.load("../turras.csv", { parse: false });
    const existingTweets = require("../tweets.json").reduce((acc, tweets) => {
        acc.push(tweets[0].id);
        return acc;
    }, []);
    const tweetIds = tweets.map((tweet) => tweet.id).reduce((acc, id) => {
        if (existingTweets.find(_id => id === _id)) return acc;
        acc.push(id);
        return acc;
    }, []);
    async function extractMetadata(page) {
        return page.evaluate(() => {
            try {
                const card = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[data-testid="card.wrapper"]');
                if (card) {
                    if(!card.querySelector("img")) return;
                    if(!card.querySelector("a")) return;
                    return {
                        type: "card",
                        img: card.querySelector("img").src,
                        url: card.querySelector("a").href
                    }
                }
            } catch (error) {
                console.error("Could not get metadata", error);
            }
        });
    }

    function parseStats(stats) {
        if (!stats) return {};
        const parsedStats = stats.split("\n");
        const result = {};
        for (let index = 0; index < parsedStats.length; index = index + 2) {
            const num = parsedStats[index];
            const category = parsedStats[index + 1];
            result[category.toLowerCase().replaceAll(" ", "")] = num;
        }
        return result;
    }

    async function getAllTweets() {
        for (const tweetId of tweetIds) {
            await page.goto(`https://twitter.com/Recuenco/status/${tweetId}`)
            console.log("Waiting for selector");
            await page.waitForSelector('div[data-testid="tweetText"]')

            let stopped = false;
            const tweets = [];

            while (!stopped) {
                await new Promise(r => setTimeout(r, 100));
                console.log("Waiting for progress bar");
                await page.waitForSelector('div[role="progressbar"]', { hidden: true });
                const tweet = await page.evaluate(() =>
                    document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[data-testid="tweetText"]').textContent
                );
                const currentTweetId = page.url().split("/").slice(-1).pop();
                console.log("currentTweetId", currentTweetId);
                const metadata = await extractMetadata(page);
                const time = await page.evaluate(() => {
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('time').dateTime;
                    return el;
                });
                const groupStats = await page.evaluate(() => {
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[role="group"]').innerText;
                    return el;
                });
                const stats = parseStats(groupStats);
                console.log("tweetId", tweetId, { tweet, id: currentTweetId, metadata, time, stats });
                tweets.push({ tweet, id: currentTweetId, metadata, time, stats });
                const lastTweetFound = await page.evaluate(() => {
                    if(document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling === null)
                        return 'finished';
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling.children[0].querySelector('div[data-testid]').querySelector("a").href;
                    return el;
                });
                console.log(lastTweetFound !== 'https://twitter.com/Recuenco');
                if (lastTweetFound !== 'https://twitter.com/Recuenco') {
                    stopped = true;
                    const existingTweets = require("../tweets.json");
                    existingTweets.push(tweets);
                    writeFileSync("../tweets.json", JSON.stringify(existingTweets));
                    continue;
                }
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
    console.log("Bye!")
    await page.close();
    process.exit(0);
})()
