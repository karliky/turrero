/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import {
    Browser as InstallBrowser,
    BrowserPlatform,
    detectBrowserPlatform,
    install,
    resolveBuildId,
} from "@puppeteer/browsers";
import type { Browser, Page } from "puppeteer-core";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    imgs?: Array<{ src: string; alt: string }>;
    embed?: {
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

function extractAuthorUrl(url: string): string {
    const author = url.split("/status/")[0];
    return author;
}

async function parseTweet({ page }: { page: Page }): Promise<Tweet> {
    /**
     * Wait for progress bar to disappear
     */
    await new Promise((r) => setTimeout(r, 100));
    console.log("Waiting for progress bar");
    await page.waitForSelector('div[role="progressbar"]', { hidden: true });

    const currentTweetId = page.url().split("/").slice(-1)[0].split("?")[0];
    console.log("currentTweetId", currentTweetId);
    const tweetAuthorUrl = extractAuthorUrl(page.url());

    const tweet = await page.evaluate(() => {
        const tweetText = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"] div[data-testid="tweetText"]',
        )
            ?.textContent;
        console.log("Found tweet text:", tweetText);
        return tweetText || "";
    });

    // Log the tweet text and ID for debugging
    console.log(`Tweet ID: ${currentTweetId}, Text: ${tweet.slice(0, 50)}...`);

    const metadata = await page.evaluate(() => {
        const article = document.querySelector('article[role="article"]');
        if (!article) {
            return {
                type: undefined,
                imgs: undefined,
                embed: { tweet: undefined },
            } as TweetMetadata;
        }

        const imgs = Array.from(article.querySelectorAll('img[alt="Image"]'))
            .map((img: Element) => ({
                src: (img as HTMLImageElement).src,
                alt: (img as HTMLImageElement).alt,
            }));

        return {
            type: imgs.length > 0 ? "media" : undefined,
            imgs: imgs.length > 0 ? imgs : undefined,
            embed: { tweet: undefined },
        } as TweetMetadata;
    });

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

                    if (statsKeyMap[key]) {
                        stats[statsKeyMap[key]] = value;
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
    console.log("Fetched tweet data:", tweet);
    await new Promise((r) => setTimeout(r, 100));
    const mustStop = tweet.author !== expectedAuthor;
    console.log("lastTweetFound", mustStop);
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
        await page.goto(
            `https://x.com/${author || "Recuenco"}/status/${tweetId}`,
        );
        console.log("Waiting for selector");
        await page.waitForSelector('div[data-testid="tweetText"]');
        try {
            await rejectCookies(page);
            console.log("Cookies rejected, closed the popup");
        } catch {
            console.log("Could not reject cookies and close the popup");
        }

        if (author === undefined) {
            const tweet = await parseTweet({ page });
            author = tweet.author;
            console.log("Author found: ", author);
        }

        let stopped = false;
        const tweets: Tweet[] = [];

        while (!stopped) {
            const { tweet, mustStop } = await fetchSingleTweet({
                page,
                expectedAuthor: author,
            });

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
            console.log("finding lastTweetFound");
            console.log("Navigating to next tweet");

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
                console.log("Debug DOM structure:", debugInfo);

                await new Promise((resolve) => setTimeout(resolve, 1000));

                await Promise.all([
                    page.waitForSelector('div[role="progressbar"]', {
                        hidden: true,
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
                console.error("Navigation error:", error);
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
                console.log("\nClosing page...");
                await page.close().catch(() => {}); // Ignore errors if page is already closed
                page = undefined;
            }
            if (browser) {
                console.log("Closing browser...");
                await browser.close().catch(() => {}); // Ignore errors if browser is already closed
                browser = undefined;
            }
        } catch (error) {
            console.error("Error during cleanup:", error);
        } finally {
            process.exit(0);
        }
    }

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    const args = process.argv.slice(2);
    const idIndex = args.indexOf("--id");
    const testMode = args.includes("--test");

    if (idIndex === -1) {
        console.error("Please provide --id <id>");
        process.exit(1);
    }

    const tweetId = args[idIndex + 1];
    if (!tweetId) {
        console.error("Please provide a value for --id");
        process.exit(1);
    }

    // Ensure Chrome is installed
    const buildId = await resolveBuildId(
        InstallBrowser.CHROME,
        detectBrowserPlatform() as BrowserPlatform,
        "latest",
    );
    const cacheDir = path.join(__dirname, "../.cache/puppeteer");
    await install({
        browser: InstallBrowser.CHROME,
        buildId,
        cacheDir,
        downloadProgressCallback: (
            downloadedBytes: number,
            totalBytes: number,
        ) => {
            console.log(
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

    console.log(testMode ? "Launching test mode..." : "Launching...");

    browser = await puppeteer.launch({
        ...browserProps,
        channel: "chrome",
        executablePath: process.env.CHROME_PATH,
    });

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

    console.log("Setting cookies");
    await page.setCookie(...cookies);

    await page.emulate(iPhone12);

    try {
        await page.goto(`https://x.com/Recuenco/status/${tweetId}`);
        console.log("Waiting for selector");
        await page.waitForSelector('div[data-testid="tweetText"]');

        const tweet = await parseTweet({ page });
        try {
            await rejectCookies(page);
            console.log("Cookies rejected, closed the popup");
        } catch {
            console.log("Could not reject cookies and close the popup");
        }

        if (testMode) {
            await fetchSingleTweet({ page, expectedAuthor: tweet.author });
            console.log("Correct exit");
        } else {
            await getAllTweets({
                page,
                author: undefined,
                tweetIds: [tweetId],
                outputFilePath: path.join(
                    __dirname,
                    "../infrastructure/db/tweets.json",
                ),
            });
        }
    } finally {
        console.log("¡Estaré aquí mismo!");
        await page.close();
        await browser.close();
    }
}

main().catch(console.error);
