const { writeFileSync } = require('fs');
const csvdata = require('csvdata');

(async () => {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ slowMo: 150 })
    const page = await browser.newPage();

    const m = puppeteer.devices['iPhone X'];
    await page.emulate(m);

    const tweets = await csvdata.load("../turras.csv", { parse: false });
    console.log('Total tweets', tweets.length);
    const args = process.argv.slice(2);

    const existingTweets = require("../tweets.json").reduce((acc, tweets) => {
        acc.push(tweets[0].id);
        return acc;
    }, []);

    let tweetIds = tweets.map((tweet) => tweet.id).reduce((acc, id) => {
        if (existingTweets.find(_id => id === _id)) return acc;
        acc.push(id);
        return acc;
    }, []);

    if (args.length === 2) tweetIds = tweetIds.slice(args[0], args[1]);

    console.log('Processing a total of tweets', tweetIds.length , JSON.stringify(tweetIds.map(t => ({id: t}))));

    async function extractMetadata(page) {
        const metadata = await page.evaluate(() => {
            try {
                const card = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[data-testid="card.wrapper"]');
                if (card) {
                    return {
                        type: "card",
                        img: card.querySelector("img") ? card.querySelector("img").src : "",
                        url: card.querySelector("a") ? card.querySelector("a").href : "",
                    }
                }

                const isMediaPresent = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector("div[aria-labelledby]");
                if(isMediaPresent && isMediaPresent.querySelector("div:not([id])") && isMediaPresent.querySelector("div:not([id])").dir !== "ltr") {
                    const images = Array.from(isMediaPresent.querySelector("div:not([id])").querySelectorAll('div[data-testid="tweetPhoto"]'));
                    if (images.length !== 0) return {
                        type: "media",
                        imgs: images.map((mediaImg) => {
                            return {
                                img: mediaImg.querySelector("img") ? mediaImg.querySelector("img").src : "",
                                url: (mediaImg.querySelector("img").closest("a")) ? mediaImg.querySelector("img").closest("a").href : ""
                            }
                        })
                    }
                }
            } catch (error) {
                return { error: "Could not get metadata ", msg: error.message }
            }
        });

        const hasEmbedTweet = await page.evaluate(() => {
            const embeddedTweet = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector("div[aria-labelledby]");
            if (embeddedTweet && embeddedTweet.querySelector("time")) return true;
        });

        if (!hasEmbedTweet && !!metadata) return metadata;
        if (!hasEmbedTweet) return metadata;

        if(await page.$('div[data-testid="app-bar-close"]') !== null) await page.click('div[data-testid="app-bar-close"]')

        await page.evaluate(() => {
            const imageContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[data-testid="tweetPhoto"]');
            if (imageContainer) return imageContainer.remove();
            return "";
        }),

        await Promise.all([ 
            page.waitForNavigation(),
            page.click('article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[tabindex="0"] div[dir="ltr"] time') 
        ]);
        const embed = {
            type: "embed",
            id: page.url().split("/").slice(-1).pop(),
            author:  await page.evaluate(() => document.querySelector("div[data-testid=User-Names]").innerText),
            tweet: await page.evaluate(() => {
                const tweetContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
                if (tweetContainer.querySelector('div[data-testid="tweetText"]')) return tweetContainer.querySelector('div[data-testid="tweetText"]').textContent;
                return "";
            })
        };
        await Promise.all([ page.waitForNavigation(), page.goBack() ]);
        if (!metadata) return { embed };
        return { ...metadata, embed };
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
                    writeFileSync("../tweets" + args.join("-") + ".json", JSON.stringify(existingTweets));
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
