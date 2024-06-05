/*
* This file contains all the functions that are used to scrape the data from the twitter page
*/

interface MediaMetadata {
    type: string;
    img?: string;
    url?: string;
    imgs?: { img: string; url: string }[];
    error?: string;
    msg?: string;
}

interface EmbedMetadata {
    type: string;
    id: string;
    author: string;
    tweet: string;
}

declare const page: any;

/**
 * This function is used to extract the text of a tweet from the Twitter Website
 */
export const getTweetText = (): string => {
    const tweetContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
    if (tweetContainer) {
        const tweetTextDiv = tweetContainer.querySelector('div[data-testid="tweetText"]');
        if (tweetTextDiv) {
            return tweetTextDiv.textContent || "";
        }
    }
    return "";
}

type MediaMetaDataorError = MediaMetadata | { error: string, msg: string };

// Extracts the metadata of a tweet (cards, media, etc)
const extractMedia = (): MediaMetaDataorError => {
    try {
        const tweetContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
        if (!tweetContainer) return { error: "No tweet found", msg: "No tweet found in the page" };

        const card = tweetContainer.querySelector('div[data-testid="card.wrapper"]');
        if (card) {
            return {
                type: "card",
                img: card.querySelector("img") ? (card.querySelector("img") as HTMLImageElement).src : "",
                url: card.querySelector("a") ? (card.querySelector("a") as HTMLAnchorElement).href : "",
            };
        }

        const isMediaPresent = tweetContainer.querySelector("div[aria-labelledby]");
        if (isMediaPresent) {
            const mediaDiv = isMediaPresent.querySelector("div:not([id])");
            if (mediaDiv && mediaDiv.getAttribute("dir") !== "ltr") {
                const images = Array.from(mediaDiv.querySelectorAll('div[data-testid="tweetPhoto"]'));
                if (images.length !== 0) {
                    return {
                        type: "media",
                        imgs: images.map((mediaImg) => {
                            const imgElement = mediaImg.querySelector("img") as HTMLImageElement;
                            const anchorElement = imgElement.closest("a") as HTMLAnchorElement;
                            return {
                                img: imgElement ? imgElement.src : "",
                                url: anchorElement ? anchorElement.href : "",
                            };
                        })
                    };
                }
            }
        }
        return { error: "No media found", msg: "No media found in the tweet" };
    } catch (error) {
        return { error: "Could not get metadata", msg: (error as Error).message };
    }
}

/**
 * Given a existing tweet, it will return the metadata of the tweet (cards, media, embed tweets, etc)
 */
export const extractMetadata = async (page: any): Promise<MediaMetadata | { embed: EmbedMetadata } | undefined> => {
    const maybeNetadata: MediaMetaDataorError = await page.evaluate(extractMedia);
    if (maybeNetadata.error) return;
    const metadata = maybeNetadata as MediaMetadata;

    const hasEmbedTweet = await page.evaluate(() => {
        const embeddedTweet = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]')?.querySelector("div[aria-labelledby]");
        if (embeddedTweet && embeddedTweet.querySelector("time")) return true;
    });

    if (!hasEmbedTweet && metadata) return metadata;
    if (!hasEmbedTweet) return metadata;

    if (await page.$('div[data-testid="app-bar-close"]') !== null) await page.click('div[data-testid="app-bar-close"]');

    // We remove the media from the tweet to be able to click on the embedded tweet
    await page.evaluate(() => {
        const imageContainer = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[data-testid="tweetPhoto"]');
        if (imageContainer) imageContainer.remove();
        return "";
    });

    // Navigate to the embedded tweet
    await Promise.all([
        page.waitForNavigation(),
        page.click('article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[tabindex="0"] div[dir="ltr"] time')
    ]);

    const embed: EmbedMetadata = {
        type: "embed",
        id: page.url().split("/").slice(-1).pop(),
        author: await page.evaluate(() => (document.querySelector("div[data-testid=User-Name]") as HTMLElement).innerText),
        tweet: await page.evaluate(getTweetText)
    };

    // Go back to the original tweet so we can continue with the rest of the tweets
    await Promise.all([page.waitForNavigation(), page.goBack()]);

    if (!metadata) return { embed };
    return { ...metadata, embed };
}
