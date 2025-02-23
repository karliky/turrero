/*
 * This file contains all the functions that are used to scrape the data from the x.com page
 */

/**
 * This function is used to extract the text of a tweet from the x.com Website
 */

export const getTweetText = () => {
    try {
        tweetContainer = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        );
        c2 = tweetContainer.querySelector('div[data-testid="tweetText"]');
        return c2.innerText;
    } catch () {
        return "";
    }
};

// Extracts the metadata of a tweet (cards, media, etc)
const extractMedia = () => {
    try {
        const card = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        ).querySelector('div[data-testid="card.wrapper"]');
        if (card) {
            return {
                type: "card",
                img: card.querySelector("img")
                    ? card.querySelector("img").src
                    : "",
                url: card.querySelector("a")
                    ? card.querySelector("a").href
                    : "",
            };
        }

        const isMediaPresent = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        ).querySelector("div[aria-labelledby]");
        if (
            isMediaPresent && isMediaPresent.querySelector("div:not([id])") &&
            isMediaPresent.querySelector("div:not([id])").dir !== "ltr"
        ) {
            const images = Array.from(
                isMediaPresent.querySelector("div:not([id])").querySelectorAll(
                    'div[data-testid="tweetPhoto"]',
                ),
            );
            if (images.length !== 0) {
                return {
                    type: "media",
                    imgs: images.map((mediaImg) => {
                        return {
                            img: mediaImg.querySelector("img")
                                ? mediaImg.querySelector("img").src
                                : "",
                            url: (mediaImg.querySelector("img").closest("a"))
                                ? mediaImg.querySelector("img").closest("a")
                                    .href
                                : "",
                        };
                    }),
                };
            }
        }
    } catch (error) {
        return { error: "Could not get metadata ", msg: error.message };
    }
};

/**
 * Given a existing tweet, it will return the metadata of the tweet (cards, media, embed tweets, etc)
 */
export const extractMetadata = async (page) => {
    try {
        // Extract metadata (e.g., media) from the tweet
        const metadata = await page
            .evaluate(extractMedia);

        // Check if there's an embedded tweet
        const hasEmbedTweet = await page.evaluate(() => {
            const embeddedTweet = document.querySelector(
                'article[tabindex="-1"][role="article"][data-testid="tweet"]',
            ).querySelector("div[aria-labelledby]");
            return !!(embeddedTweet && embeddedTweet.querySelector("time")); // Returns true if embedded tweet exists
        });

        // Return metadata if no embedded tweet exists
        if (!hasEmbedTweet && !!metadata) return metadata;
        if (!hasEmbedTweet) return metadata;

        // If the embedded tweet exists, check if the "close button" is present and click to close it
        if (await page.$('div[data-testid="app-bar-close"]') !== null) {
            await page.click('div[data-testid="app-bar-close"]');
        }

        // Remove media from the tweet to enable interaction with the embedded tweet
        await page.evaluate(() => {
            const imageContainer = document.querySelector(
                'article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[data-testid="tweetPhoto"]',
            );
            if (imageContainer) imageContainer.remove();
        });

        // Navigate to the embedded tweet
        await Promise.all([
            page.waitForNavigation(),
            // document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[tabindex="0"] div[dir="ltr"] time')
            // .click()
            page.click(
                'article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[tabindex="0"] div[dir="ltr"] time',
            ),
        ]);

        // Extract details of the embedded tweet
        const embed = {
            type: "embed",
            id: page.url().split("/").slice(-1).pop(),
            author: await page.evaluate(() => {
                const authorElement = document.querySelector(
                    "div[data-testid=User-Name]",
                );
                return authorElement ? authorElement.innerText : null;
            }),
            tweet: await page.evaluate(getTweetText),
        };

        // Return to the original tweet after extracting embedded tweet details
        await Promise.all([
            page.waitForNavigation(),
            page.goBack(),
        ]);

        // Return combined metadata and embedded tweet
        return metadata ? { ...metadata, embed } : { embed };
    } catch (error) {
        console.error("Error in extractMetadata:", error);
        return null; // Fallback to null if extraction fails
    }
};

//module.exports.getTweetText = getTweetText;
