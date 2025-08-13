/*
 * This file contains all the functions that are used to scrape the data from the x.com page
 */

import type { Page } from 'puppeteer';
import type { ContextualError } from '../infrastructure/types/index.js';
import { TweetMetadataType } from '../infrastructure/types/index.js';

interface MediaImage {
    img: string;
    url: string;
}

interface CardMedia {
    type: TweetMetadataType.CARD;
    img: string;
    url: string;
}

interface PhotoMedia {
    type: TweetMetadataType.IMAGE;
    imgs: MediaImage[];
}

interface MediaError {
    error: string;
    msg: string;
}

interface EmbedTweet {
    type: TweetMetadataType.EMBED;
    id: string;
    author: string | null;
    tweet: string;
}

type MediaMetadata = CardMedia | PhotoMedia | MediaError;
type TweetMetadata = MediaMetadata | { embed: EmbedTweet } | (MediaMetadata & { embed: EmbedTweet }) | null;

/**
 * This function is used to extract the text of a tweet from the x.com Website
 */
export const getTweetText = (): string => {
    try {
        const tweetContainer = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        );
        const c2 = tweetContainer?.querySelector('div[data-testid="tweetText"]') as HTMLElement;
        return c2?.innerText || "";
    } catch {
        return "";
    }
};

// Extracts the metadata of a tweet (cards, media, etc)
const extractMedia = (): MediaMetadata | undefined => {
    try {
        const tweetContainer = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        );
        
        const card = tweetContainer?.querySelector('div[data-testid="card.wrapper"]');
        if (card) {
            const imgElement = card.querySelector("img") as HTMLImageElement;
            const linkElement = card.querySelector("a") as HTMLAnchorElement;
            return {
                type: TweetMetadataType.CARD,
                img: imgElement ? imgElement.src : "",
                url: linkElement ? linkElement.href : "",
            };
        }

        const isMediaPresent = tweetContainer?.querySelector("div[aria-labelledby]") as HTMLElement;
        if (
            isMediaPresent && isMediaPresent.querySelector("div:not([id])") &&
            (isMediaPresent.querySelector("div:not([id])") as HTMLElement).dir !== "ltr"
        ) {
            const mediaContainer = isMediaPresent.querySelector("div:not([id])");
            const images = Array.from(
                mediaContainer?.querySelectorAll('div[data-testid="tweetPhoto"]') || []
            );
            if (images.length !== 0) {
                return {
                    type: TweetMetadataType.IMAGE,
                    imgs: images.map((mediaImg) => {
                        const img = mediaImg.querySelector("img") as HTMLImageElement;
                        const link = img?.closest("a") as HTMLAnchorElement;
                        return {
                            img: img ? img.src : "",
                            url: link ? link.href : "",
                        };
                    }),
                };
            }
        }
    } catch (error: unknown) {
        const contextError = error as ContextualError;
        return { error: "Could not get metadata ", msg: contextError.message || 'Unknown error' };
    }
    
    return undefined;
};

/**
 * Given a existing tweet, it will return the metadata of the tweet (cards, media, embed tweets, etc)
 */
export const extractMetadata = async (page: Page): Promise<TweetMetadata> => {
    try {
        // Extract metadata (e.g., media) from the tweet
        const metadata: MediaMetadata | undefined = await page
            .evaluate(extractMedia);

        // Check if there's an embedded tweet
        const hasEmbedTweet = await page.evaluate(() => {
            const tweetContainer = document.querySelector(
                'article[tabindex="-1"][role="article"][data-testid="tweet"]',
            );
            const embeddedTweet = tweetContainer?.querySelector("div[aria-labelledby]");
            return !!(embeddedTweet && embeddedTweet.querySelector("time")); // Returns true if embedded tweet exists
        });

        // Return metadata if no embedded tweet exists
        if (!hasEmbedTweet && !!metadata) return metadata;
        if (!hasEmbedTweet) return metadata || null;

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
            page.click(
                'article[tabindex="-1"][role="article"][data-testid="tweet"] div[aria-labelledby] div[tabindex="0"] div[dir="ltr"] time',
            ),
        ]);

        // Extract details of the embedded tweet
        const embed: EmbedTweet = {
            type: TweetMetadataType.EMBED,
            id: page.url().split("/").slice(-1).pop() || "",
            author: await page.evaluate(() => {
                const authorElement = document.querySelector(
                    "div[data-testid=User-Name]",
                ) as HTMLElement;
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