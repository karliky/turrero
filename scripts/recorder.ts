/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import dotenv from "dotenv";
import { dirname } from "@std/path";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import { createDenoLogger } from "../infrastructure/logger.ts";
import {
    Browser as InstallBrowser,
    BrowserPlatform,
    detectBrowserPlatform,
    install,
    resolveBuildId,
} from "@puppeteer/browsers";
import type { Browser, Page } from "puppeteer-core";
import { TweetMetadataType } from '../infrastructure/types/index.ts';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createDenoLogger("recorder");

const __dirname = dirname(new URL(import.meta.url).pathname);

// Define device configuration for iPhone 12
const iPhone12 = {
    name: "iPhone 12",
    userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
    viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false,
    },
};

interface TweetMetadata {
    type?: string;
    imgs?: Array<{ img: string; url: string }>;
    img?: string;
    url?: string;
    domain?: string;       // Extracted from card.layoutSmall.detail (e.g., "goodreads.com", "youtube.com")
    title?: string;        // Extracted from card.layoutSmall.detail (e.g., book title, video title)
    description?: string;  // Extracted from card.layoutSmall.detail (snippet/preview text)
    embed?: {
        type?: string;
        id?: string;
        author?: string;
        tweet?: string;
    };
}

interface Tweet {
    tweet: string;
    author: string;
    id: string;
    metadata: TweetMetadata;
    time: string;
    stats: {
        replies?: string;
        retweets?: string;
        likes?: string;
        bookmarks?: string;
        views?: string;
    };
}

interface TweetCSV {
    id: string;
    [key: string]: string;
}

/**
 * Parse CSV file into an array of objects.
 * @param filePath Path to the CSV file.
 * @returns Array of objects where each object represents a row in the CSV.
 */
function parseCSV(filePath: string): TweetCSV[] {
    const csvContent = readFileSync(filePath, { encoding: "utf8" });
    const lines = csvContent.split("\n");
    if (lines.length === 0) {
        throw new Error("CSV file is empty");
    }
    const headers = lines[0]!.split(",");
    return lines.slice(1).map((line: string) => {
        const data = line.split(",");
        const obj = headers.reduce(
            (
                acc: { [key: string]: string },
                nextKey: string,
                index: number,
            ) => {
                acc[nextKey.trim()] =
                    data[index]?.replace(/(^"|"$)/g, "").trim() ?? "";
                return acc;
            },
            { id: "" }, // Initialize with required 'id' property
        );
        return obj as TweetCSV;
    });
}

function extractAuthorUrl(url: string): string {
    const author = url.split("/status/")[0];
    if (author === undefined) {
        throw new Error("Invalid URL format: cannot extract author");
    }
    return author;
}

async function parseTweet({ page }: { page: Page }): Promise<Tweet> {
    /**
     * Wait for progress bar to disappear
     */
    await new Promise((r) => setTimeout(r, 100));
    logger.debug("Waiting for progress bar");
    await page.waitForSelector('div[role="progressbar"]', {
        hidden: true,
        timeout: 30000 // 30 seconds timeout to prevent infinite waiting
    });

    const urlParts = page.url().split("/").slice(-1);
    if (urlParts.length === 0 || !urlParts[0]) {
        throw new Error("Invalid URL format: cannot extract tweet ID");
    }
    const currentTweetId = urlParts[0].split("?")[0]!;
    logger.debug("currentTweetId", currentTweetId);
    const tweetAuthorUrl = extractAuthorUrl(page.url());

    const tweet = await page.evaluate(() => {
        const tweetText = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"] div[data-testid="tweetText"]',
        )
            ?.textContent;
        // Note: This console.log is inside page.evaluate() and cannot be replaced with logger
        return tweetText || "";
    });

    // Log the tweet text and ID for debugging
    logger.debug(`Tweet ID: ${currentTweetId}, Text: ${tweet.slice(0, 50)}...`);

    const metadata = await page.evaluate((tweetUrl: string) => {
        // Use specific selector to target the CURRENT tweet's article, not just any article on the page
        // tabindex="-1" identifies the main focused tweet (not replies or other tweets in the timeline)
        const article = document.querySelector('article[tabindex="-1"][role="article"][data-testid="tweet"]');
        if (!article) {
            return {
                type: undefined,
                imgs: undefined,
                embed: undefined,
            } as unknown as TweetMetadata;
        }

        // Check for card first (Goodreads, article previews, etc.)
        // Twitter uses multiple card formats:
        // - Old: div[data-testid="card.wrapper"]
        // - New small: div[data-testid="card.layoutSmall.detail"]
        // - New large: div[data-testid="card.layoutLarge.detail"]
        const card = article.querySelector(
            'div[data-testid="card.wrapper"], ' +
            'div[data-testid="card.layoutSmall.detail"], ' +
            'div[data-testid="card.layoutLarge.detail"]'
        );
        if (card) {
            // Try to find image - could be various formats
            const imgElement = card.querySelector("img") as HTMLImageElement;

            // Search for link more broadly - small cards often have links in media section or parent wrapper
            // Try multiple selectors to handle different card layouts
            const linkElement = card.querySelector("a[href]") as HTMLAnchorElement;

            // Extract additional metadata from card.layoutSmall.detail if present
            // Structure: 3 divs with spans containing: 1) domain, 2) title, 3) description
            let domain = "";
            let title = "";
            let description = "";

            const cardDetail = article.querySelector('div[data-testid="card.layoutSmall.detail"], div[data-testid="card.layoutLarge.detail"]');
            if (cardDetail) {
                const textDivs = cardDetail.querySelectorAll('div[dir="auto"]');
                if (textDivs.length >= 1) domain = textDivs[0].textContent?.trim() || "";
                if (textDivs.length >= 2) title = textDivs[1].textContent?.trim() || "";
                if (textDivs.length >= 3) description = textDivs[2].textContent?.trim() || "";
            }

            return {
                type: 'card',
                img: imgElement ? imgElement.src : "",
                url: linkElement ? linkElement.href : "",
                domain: domain || undefined,
                title: title || undefined,
                description: description || undefined,
                imgs: undefined,
                embed: undefined,
            } as unknown as TweetMetadata;
        }

        // Check for images and GIFs - only inside tweetPhoto containers to avoid false positives
        // Note: X.com represents GIFs as <video> elements with poster thumbnails
        const tweetPhotos = article.querySelectorAll('div[data-testid="tweetPhoto"]');
        const imgs = Array.from(tweetPhotos)
            .map((container, index) => {
                // First check for regular images
                const img = container.querySelector('img') as HTMLImageElement;
                if (img) {
                    return {
                        img: img.src,
                        url: `${tweetUrl}/photo/${index + 1}`,
                    };
                }

                // Then check for GIFs (which are video elements in X.com)
                const video = container.querySelector('video') as HTMLVideoElement;
                if (video) {
                    // Use poster image as thumbnail, or video src if no poster
                    return {
                        img: video.poster || video.src || "",
                        url: `${tweetUrl}/photo/${index + 1}`,
                    };
                }

                return null;
            })
            .filter((item): item is { img: string; url: string } => item !== null && item.img !== "");

        return {
            type: imgs.length > 0 ? 'media' : undefined,
            imgs: imgs.length > 0 ? imgs : undefined,
            embed: undefined,
        } as unknown as TweetMetadata;
    }, page.url());

    // Check for embedded tweet and extract if present - extract directly from DOM without navigation
    const embedData = await page.evaluate(() => {
        const tweetContainer = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        );
        const embeddedTweetContainer = tweetContainer?.querySelector("div[aria-labelledby]");

        if (!embeddedTweetContainer) return null;

        // Extract embed ID from multiple possible sources
        // Try 1: Look for direct link with /status/ in href
        let embedId = "";
        const embedLink = embeddedTweetContainer.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
        if (embedLink?.href) {
            embedId = embedLink.href.split('/status/')[1]?.split('?')[0]?.split('/')[0] || "";
        }

        // Try 2: Look for clickable container with role="link" that might have the tweet
        if (!embedId) {
            const clickableContainer = embeddedTweetContainer.querySelector('div[role="link"][tabindex="0"]') as HTMLElement;
            if (clickableContainer) {
                // The embed exists but ID might be in parent link or time element
                const timeElement = embeddedTweetContainer.querySelector('time') as HTMLTimeElement;
                if (timeElement) {
                    // We found an embedded tweet structure, use a placeholder ID from time
                    embedId = timeElement.dateTime; // Fallback to timestamp
                }
            }
        }

        // Extract author name from User-Name div
        const authorElement = embeddedTweetContainer.querySelector('div[data-testid="User-Name"]') as HTMLElement;
        const authorText = authorElement?.innerText || "";

        // Extract tweet text
        const tweetTextElement = embeddedTweetContainer.querySelector('div[data-testid="tweetText"]') as HTMLElement;
        const tweetText = tweetTextElement?.innerText || "";

        // Return embed data if we have text and author, even without full ID
        return (authorText && tweetText) ? {
            type: "embed",
            id: embedId || "unknown",
            author: authorText,
            tweet: tweetText,
        } : null;
    });

    if (embedData) {
        metadata.embed = embedData;
        logger.debug(`Detected embedded tweet: ${embedData.id} from ${embedData.author}`);
    }

    await new Promise((r) => setTimeout(r, 100));

    const time = await page.evaluate(() => {
        const timeElement = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"] time',
        ) as HTMLTimeElement | null;
        return timeElement?.dateTime || "";
    });

    const stats = await page.evaluate(() => {
        const statsKeyMap: { [key: string]: string } = {
            likes: "likes",
            like: "likes",
            views: "views",
            view: "views",
            replies: "replies",
            reply: "replies",
            reposts: "retweets",
            repost: "retweets",
            bookmarks: "bookmarks",
            bookmark: "bookmarks",
        };

        function parseStats(text: string): { [key: string]: string } {
            const stats: { [key: string]: string } = {};
            const segments = text.split(",");

            segments.forEach((segment) => {
                const match = segment.trim().match(/(\d+)\s(\w+)/);
                if (match) {
                    const value = match[1];
                    const key = match[2];

                    if (key && value && statsKeyMap[key]) {
                        const mappedKey = statsKeyMap[key];
                        if (mappedKey) {
                            stats[mappedKey] = value;
                        }
                    }
                }
            });

            return stats;
        }

        const statsLabel = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"] div[role="group"]',
        )?.getAttribute("aria-label")?.toLowerCase() || "";

        return parseStats(statsLabel);
    });

    const actualTweet = (tweet === metadata?.embed?.tweet) ? "" : tweet;

    return {
        tweet: actualTweet,
        author: tweetAuthorUrl,
        id: currentTweetId,
        metadata,
        time,
        stats,
    };
}

async function rejectCookies(page: Page): Promise<void> {
    await page.evaluate(() => {
        const cookieButton = Array.from(document.querySelectorAll("span"))
            .find((el: Element) =>
                (el as HTMLElement).textContent?.includes("Welcome to x.com!")
            );
        if (cookieButton) {
            const closeButton = (cookieButton as Element)
                .parentElement?.parentElement?.parentElement?.parentElement
                ?.querySelector("button") as HTMLButtonElement;
            if (closeButton) {
                closeButton.click();
            }
        }
    });

    await page.evaluate(() => {
        const cookieButton = Array.from(document.querySelectorAll("span"))
            .find((el: Element) =>
                (el as HTMLElement).textContent?.includes(
                    "Refuse non-essential cookies",
                )
            ) as HTMLElement | undefined;
        if (cookieButton) {
            cookieButton.click();
        }
    });
}

async function fetchSingleTweet(
    { page, expectedAuthor }: { page: Page; expectedAuthor: string },
): Promise<{ tweet: Tweet; mustStop: boolean }> {
    const tweet = await parseTweet({ page });
    logger.debug("Fetched tweet data:", tweet);
    await new Promise((r) => setTimeout(r, 100));
    const mustStop = tweet.author !== expectedAuthor;
    logger.debug("lastTweetFound", mustStop);
    return { tweet, mustStop };
}

async function getAllTweets({
    page,
    author,
    tweetIds,
    outputFilePath,
}: {
    page: Page;
    author: string | undefined;
    tweetIds: string[];
    outputFilePath: string;
}): Promise<void> {
    for (const tweetId of tweetIds) {
        // Check if page is still valid before continuing
        if (page.isClosed()) {
            logger.warn("Page is closed, stopping scraping");
            break;
        }

        try {
            await page.goto(
                `https://x.com/${author || "Recuenco"}/status/${tweetId}`,
            );
        } catch (error) {
            if (error instanceof Error &&
                (error.message.includes("detached") ||
                 error.message.includes("Connection closed"))) {
                logger.error("Navigation failed - page detached or connection closed:", error.message);
                break;
            }
            throw error;
        }

        logger.debug("Waiting for selector");
        try {
            await page.waitForSelector('div[data-testid="tweetText"]');
        } catch (error) {
            if (error instanceof Error &&
                (error.message.includes("detached") ||
                 error.message.includes("Connection closed"))) {
                logger.error("Wait for selector failed - page detached or connection closed:", error.message);
                break;
            }
            throw error;
        }

        try {
            await rejectCookies(page);
            logger.debug("Cookies rejected, closed the popup");
        } catch {
            logger.debug("Could not reject cookies and close the popup");
        }

        if (author === undefined) {
            try {
                const tweet = await parseTweet({ page });
                author = tweet.author;
                logger.info("Author found: ", author);
            } catch (error) {
                if (error instanceof Error &&
                    (error.message.includes("detached") ||
                     error.message.includes("Connection closed"))) {
                    logger.error("Parse tweet failed - page detached or connection closed:", error.message);
                    break;
                }
                throw error;
            }
        }

        let stopped = false;
        const tweets: Tweet[] = [];

        while (!stopped) {
            let tweet, mustStop;
            try {
                ({ tweet, mustStop } = await fetchSingleTweet({
                    page,
                    expectedAuthor: author,
                }));
            } catch (error) {
                if (error instanceof Error &&
                    (error.message.includes("detached") ||
                     error.message.includes("Connection closed"))) {
                    logger.error("Fetch tweet failed - page detached or connection closed:", error.message);
                    stopped = true;
                    break;
                }
                throw error;
            }

            if (mustStop) {
                stopped = true;
                const existingTweets = JSON.parse(
                    readFileSync(outputFilePath, "utf-8"),
                );
                existingTweets.push(tweets);
                writeFileSync(
                    outputFilePath,
                    JSON.stringify(existingTweets, null, 4),
                );
                author = undefined;
                break;
            }

            tweets.push(tweet);
            logger.debug("finding lastTweetFound");
            logger.debug("Navigating to next tweet");

            try {
                await page.waitForSelector(
                    'article[tabindex="-1"][role="article"][data-testid="tweet"]',
                    { timeout: 5000 },
                );

                const debugInfo = await page.evaluate(() => {
                    const currentTweet = document.querySelector(
                        'article[tabindex="-1"][role="article"][data-testid="tweet"]',
                    );
                    const cellDiv = currentTweet?.closest(
                        'div[data-testid="cellInnerDiv"]',
                    );
                    const nextSibling = cellDiv?.nextElementSibling;
                    const nextNextSibling = nextSibling?.nextElementSibling;

                    return {
                        hasTweet: !!currentTweet,
                        hasCellDiv: !!cellDiv,
                        hasNextSibling: !!nextSibling,
                        hasNextNextSibling: !!nextNextSibling,
                        nextSiblingHtml: nextNextSibling?.innerHTML?.slice(
                            0,
                            100,
                        ),
                    };
                });
                logger.debug("Debug DOM structure:", debugInfo);

                await new Promise((resolve) => setTimeout(resolve, 1000));

                await Promise.all([
                    page.waitForSelector('div[role="progressbar"]', {
                        hidden: true,
                        timeout: 30000
                    }),
                    page.evaluate(() => {
                        return new Promise<void>((resolve, reject) => {
                            const maxAttempts = 3;
                            let attempts = 0;

                            const tryClick = () => {
                                attempts++;
                                const currentTweet = document.querySelector(
                                    'article[tabindex="-1"][role="article"][data-testid="tweet"]',
                                );
                                if (!currentTweet) {
                                    if (attempts < maxAttempts) {
                                        setTimeout(tryClick, 500);
                                        return;
                                    }
                                    reject(
                                        new Error(
                                            "Could not find current tweet",
                                        ),
                                    );
                                    return;
                                }

                                const cellDiv = currentTweet.closest(
                                    'div[data-testid="cellInnerDiv"]',
                                );
                                if (!cellDiv) {
                                    if (attempts < maxAttempts) {
                                        setTimeout(tryClick, 500);
                                        return;
                                    }
                                    reject(
                                        new Error("Could not find cell div"),
                                    );
                                    return;
                                }

                                const nextTweet = cellDiv.nextElementSibling
                                    ?.nextElementSibling?.querySelector(
                                        'article[data-testid="tweet"]',
                                    ) as HTMLElement;
                                if (!nextTweet) {
                                    if (attempts < maxAttempts) {
                                        setTimeout(tryClick, 500);
                                        return;
                                    }
                                    reject(
                                        new Error("Could not find next tweet"),
                                    );
                                    return;
                                }

                                nextTweet.click();
                                resolve();
                            };

                            tryClick();
                        });
                    }),
                    page.waitForNavigation({ timeout: 10000 }),
                ]);
            } catch (error) {
                logger.error("Navigation error:", error);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await page.reload();
                await page.waitForSelector(
                    'article[tabindex="-1"][role="article"][data-testid="tweet"]',
                    { timeout: 5000 },
                );
                continue;
            }
        }
    }
}

// Main execution
async function main() {
    let browser: Browser | undefined;
    let page: Page | undefined;

    // Handle Ctrl+C and process termination
    async function cleanup() {
        try {
            if (page) {
                logger.info("\nClosing page...");
                await page.close().catch(() => {}); // Ignore errors if page is already closed
                page = undefined;
            }
            if (browser) {
                logger.info("Closing browser...");
                await browser.close().catch(() => {}); // Ignore errors if browser is already closed
                browser = undefined;
            }
        } catch (error) {
            logger.error("Error during cleanup:", error);
        } finally {
            process.exit(0);
        }
    }

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    const args = process.argv.slice(2);
    const testIndex = args.indexOf("--test");
    const testMode = testIndex !== -1;

    // Ensure Chrome is installed
    const buildId = await resolveBuildId(
        InstallBrowser.CHROME,
        detectBrowserPlatform() as BrowserPlatform,
        "latest",
    );
    const cacheDir = join(__dirname, "../.cache/puppeteer");
    await install({
        browser: InstallBrowser.CHROME,
        buildId,
        cacheDir,
        downloadProgressCallback: (
            downloadedBytes: number,
            totalBytes: number,
        ) => {
            logger.info(
                `Download progress: ${
                    Math.round((downloadedBytes / totalBytes) * 100)
                }%`,
            );
        },
    });

    const browserProps = testMode
        ? {
            headless: false,
            slowMo: 50,
        }
        : {
            headless: true,
            slowMo: Math.floor(Math.random() * 150) + 750,
        };

    logger.info(testMode ? "Launching test mode..." : "Launching...");

    const launchOptions: Record<string, unknown> = {
        ...browserProps,
        channel: "chrome",
    };
    
    if (process.env.CHROME_PATH) {
        launchOptions.executablePath = process.env.CHROME_PATH;
    }
    
    browser = await puppeteer.launch(launchOptions);

    page = await browser.newPage();

    const cookies = [
        { name: "twid", value: process.env.twid || "", domain: "x.com" },
        {
            name: "auth_token",
            value: process.env.auth_token || "",
            domain: "x.com",
        },
        { name: "lang", value: process.env.lang || "", domain: "x.com" },
        {
            name: "d_prefs",
            value: process.env.d_prefs || "",
            domain: "x.com",
        },
        { name: "kdt", value: process.env.kdt || "", domain: "x.com" },
        { name: "ct0", value: process.env.ct0 || "", domain: "x.com" },
        {
            name: "guest_id",
            value: process.env.guest_id || "",
            domain: "x.com",
        },
        {
            name: "domain",
            value: "https://x.com/",
            domain: "x.com",
        },
    ];

    logger.debug("Setting cookies");
    await page.setCookie(...cookies);

    await page.emulate(iPhone12);

    try {
        if (testMode) {
            const tweetId = args[testIndex + 1];
            if (!tweetId) {
                logger.error("Please provide a tweet ID after --test");
                process.exit(1);
            }

            await page.goto(`https://x.com/Recuenco/status/${tweetId}`);
            logger.debug("Waiting for selector");
            await page.waitForSelector('div[data-testid="tweetText"]');

            const tweet = await parseTweet({ page });
            try {
                await rejectCookies(page);
                logger.debug("Cookies rejected, closed the popup");
            } catch {
                logger.debug("Could not reject cookies and close the popup");
            }

            await fetchSingleTweet({ page, expectedAuthor: tweet.author });
            logger.info("Correct exit");
        } else {
            const existingTweetsData = JSON.parse(
                readFileSync(
                    join(__dirname, "../infrastructure/db/tweets.json"),
                    "utf-8",
                ),
            );
            const tweets = parseCSV(
                join(__dirname, "../infrastructure/db/turras.csv"),
            );

            const existingTweets = existingTweetsData.reduce(
                (acc: string[], tweets: Tweet[]) => {
                    if (tweets && tweets.length > 0 && tweets[0]) {
                        acc.push(tweets[0].id);
                    }
                    return acc;
                },
                [],
            );

            const tweetIds = tweets
                .map((tweet) => tweet.id)
                .filter((id) => !existingTweets.includes(id));

            logger.info("Processing a total of tweets:", tweetIds.length);

            await getAllTweets({
                page,
                author: undefined,
                tweetIds,
                outputFilePath: join(
                    __dirname,
                    "../infrastructure/db/tweets.json",
                ),
            });
        }
    } finally {
        logger.info("¡Estaré aquí mismo!");
        try {
            await page.close();
        } catch (error) {
            logger.debug("Page already closed or connection lost:", error);
        }
        try {
            await browser.close();
        } catch (error) {
            logger.debug("Browser already closed or connection lost:", error);
        }
    }
}

main().catch((error) => {
    const logger = createDenoLogger("recorder");
    logger.error("Main function error:", error);
});
