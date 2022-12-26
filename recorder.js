const { writeFileSync } = require('fs');
const { url } = require('inspector');

(async () => {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({})
    const page = await browser.newPage()

    const m = puppeteer.devices['iPhone X']
    await page.emulate(m)

    const tweetLibrary = [];
    const tweetIds = [
        "1502547574263361538",
        "1500015623090360324",
        "1497479266354794497",
        "1494930415504789506",
        "1494930305811111938",
        "1492405460682657792",
        "1489874989809639424",
        "1487312375351029760",
        "1484786841270329349",
        "1484786680439746562",
    ]

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

    async function getAllTweets() {
        for (const tweetId of tweetIds) {
            await page.goto(`https://twitter.com/Recuenco/status/${tweetId}`)

            await page.waitForSelector('div[data-testid="tweetText"]')

            let stopped = false;
            const tweets = [];

            while (!stopped) {
                await new Promise(r => setTimeout(r, 100));
                await page.waitForSelector('div[role="progressbar"]', { hidden: true });
                const tweet = await page.evaluate(() =>
                    document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[data-testid="tweetText"]').textContent
                );
                const currentTweetId = page.url().split("/").slice(-1).pop();
                const metadata = await extractMetadata(page);
                console.log("tweetId", tweetId, { tweet, id: currentTweetId, metadata });
                tweets.push({ tweet, id: currentTweetId, metadata });
                const lastTweetFound = await page.evaluate(() => {
                    const el = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling.children[0].querySelector('div[data-testid]').querySelector("a").href;
                    return el;
                });

                if (lastTweetFound !== 'https://twitter.com/Recuenco') {
                    stopped = true;
                    tweetLibrary.push(tweets);
                    continue;
                }
                await Promise.all([
                    page.waitForSelector('div[role="progressbar"]', { hidden: true }),
                    page.evaluate(() => {
                        document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').parentElement.parentElement.parentElement.parentElement.nextSibling.nextElementSibling.children[0].querySelector('div[data-testid="tweetText"]').click()
                    }),
                    page.waitForNavigation()
                ]);
            }
        }
    }

    await getAllTweets();

    writeFileSync("./tweets.json", JSON.stringify(tweetLibrary));
    console.log("Bye!")
    await page.close();
    process.exit(0);
})()
