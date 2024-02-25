/*
* This file contains all the functions that are used to scrape the data from the twitter page
*/

/**
 * This function is used to extract the text of a tweet from the Twitter Website
 */

const getTweetText = () => {
    const tweetContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
    if (tweetContainer.querySelector('div[data-testid="tweetText"]'))
        return tweetContainer.querySelector('div[data-testid="tweetText"]').textContent;
    return "";
}

// Extracts the metadata of a tweet (cards, media, etc)
const extractMedia = () => {
    try {
        const card = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector('div[data-testid="card.wrapper"]');
        if (card) {
            return {
                type: "card",
                img: card.querySelector("img") ? card.querySelector("img").src : "",
                url: card.querySelector("a") ? card.querySelector("a").href : "",
            };
        }

        const isMediaPresent = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector("div[aria-labelledby]");
        if (isMediaPresent && isMediaPresent.querySelector("div:not([id])") && isMediaPresent.querySelector("div:not([id])").dir !== "ltr") {
            const images = Array.from(isMediaPresent.querySelector("div:not([id])").querySelectorAll('div[data-testid="tweetPhoto"]'));
            if (images.length !== 0)
                return {
                    type: "media",
                    imgs: images.map((mediaImg) => {
                        return {
                            img: mediaImg.querySelector("img") ? mediaImg.querySelector("img").src : "",
                            url: (mediaImg.querySelector("img").closest("a")) ? mediaImg.querySelector("img").closest("a").href : ""
                        };
                    })
                };
        }
    } catch (error) {
        return { error: "Could not get metadata ", msg: error.message };
    }
}

/**
 * Given a existing tweet, it will return the metadata of the tweet (cards, media, embed tweets, etc)
 */
module.exports.extractMetadata = async (page) => {
    const metadata = await page.evaluate(extractMedia);
    const hasEmbedTweet = await page.evaluate(() => {
        const embeddedTweet = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]').querySelector("div[aria-labelledby]");
        if (embeddedTweet && embeddedTweet.querySelector("time")) return true;
    });

    if (!hasEmbedTweet && !!metadata) return metadata;
    if (!hasEmbedTweet) return metadata;

    if (await page.$('div[data-testid="app-bar-close"]') !== null) await page.click('div[data-testid="app-bar-close"]')

    // We remove the media from the tweet to be able to click on the embedded tweet
    await page.evaluate(() => {
        const imageContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[data-testid="tweetPhoto"]');
        if (imageContainer) return imageContainer.remove();
        return "";
    }),
    // Navigate to the embedded tweet
    await page.waitForTimeout(50);
    await Promise.all([
        page.waitForNavigation(),
        page.click('article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[tabindex="0"] div[dir="ltr"] time')
    ]);
    const embed = {
        type: "embed",
        id: page.url().split("/").slice(-1).pop(),
        author: await page.evaluate(() => document.querySelector("div[data-testid=User-Name]").innerText),
        tweet: await page.evaluate(getTweetText)
    };
    // Go back to the original tweet so we can continue with the rest of the tweets
    await Promise.all([page.waitForNavigation(), page.goBack()]);
    if (!metadata) return { embed };
    return { ...metadata, embed };
}

module.exports.getTweetText = getTweetText;
