const { writeFileSync } = require('fs');
const csvdata = require('csvdata');

(async () => {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ slowMo: 150 })
    const page = await browser.newPage();

    const m = puppeteer.devices['iPhone X'];
    await page.emulate(m);

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
                const embeddedTweet = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector("div[aria-labelledby]").querySelector("time");
                if (embeddedTweet) {
                    embeddedTweet.click();
                    const embed = {
                        type: "embeddedTweet",
                        id: window.location.href.split("/").pop(),
                        author: document.querySelector("div[data-testid=User-Names]").innerText,
                        tweet: document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[data-testid="tweetText"]').textContent
                    };
                    history.back();
                    return embed;
                }
            } catch (error) {
                console.error("Could not get metadata", error);
            }
        });
    }

    function parseStats(stats) {
        if (!stats) return {};
        const parsedStats = stats.split("-");
        parsedStats.pop();
        const result = {};
        for (let index = 0; index < parsedStats.length; index++) {
            const label = parsedStats[index].split("\n");
            const num = label[0];
            const category = label[1];
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
                const currentTweetId = page.url().split("/").slice(-1).pop();
                const tweet = await page.evaluate(() => {
                    const tweetContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
                    if (tweetContainer.querySelector('div[data-testid="tweetText"]')) return tweetContainer.querySelector('div[data-testid="tweetText"]').textContent;
                    return "";
                });

                console.log("currentTweetId", currentTweetId);
                const metadata = await extractMetadata(page);
                await new Promise(r => setTimeout(r, 100));
                const time = await page.evaluate(() => {
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('time').dateTime;
                    return el;
                });
                const groupStats = await page.evaluate(() => {
                    const el = Array.from(document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelectorAll('span[data-testid="app-text-transition-container"]')).reduce((acc, value) => acc + value.parentElement.parentElement.innerText+"-", "")
                    return el;
                });
                const stats = parseStats(groupStats);
                console.log("tweetId", tweetId, { tweet, id: currentTweetId, metadata, time, stats });
                tweets.push({ tweet, id: currentTweetId, metadata, time, stats });
                console.log("finding lastTweetFound");
                await new Promise(r => setTimeout(r, 100));
                const lastTweetFound = await page.evaluate(() => {
                    if(document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling === null)
                        return 'finished';
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling.children[0].querySelector('div[data-testid]').querySelector("a").href;
                    return el;
                });
                console.log("lastTweetFound", lastTweetFound !== 'https://twitter.com/Recuenco');
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
