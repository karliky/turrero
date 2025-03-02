import type { Page } from "puppeteer-core";
import { Tweet, TweetNavigationConfig } from "./types.ts";
import { parseTweet } from "./tweet-parser.ts";
import { rejectCookies } from "./cookie-handler.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export async function navigateToNextTweet(
    page: Page,
): Promise<void> {
    // Navigate to next tweet using DOM traversal
    await page.evaluate(() => {
        const tweet = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        );
        const cell = tweet?.closest('div[data-testid="cellInnerDiv"]');
        const nextTweet = cell?.nextElementSibling?.nextElementSibling
            ?.querySelector('article[data-testid="tweet"]');

        if (!nextTweet) {
            throw new Error("Could not find next tweet");
        }

        (nextTweet as HTMLElement).click();
    });

    // Wait for new content to load
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 }),
        page.waitForSelector('div[data-testid="tweetText"]', {
            visible: true,
            timeout: 10000,
        }),
    ]);
}

export async function handleNavigationError(page: Page): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await page.reload();
    await page.waitForSelector(
        'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        { timeout: 5000 },
    );
}

export async function fetchSingleTweet(
    { page, expectedAuthor }: { page: Page; expectedAuthor: string },
): Promise<{ tweet: Tweet; mustStop: boolean }> {
    const tweet = await parseTweet({ page });
    console.log("Fetched tweet data:", tweet);
    await new Promise((r) => setTimeout(r, 100));
    const mustStop = tweet.author !== expectedAuthor;
    console.log("lastTweetFound", mustStop);
    return { tweet, mustStop };
}

export async function getAllTweets(
    config: TweetNavigationConfig,
): Promise<void> {
    const { page, author, tweetId, outputFilePath } = config;

    // Ensure output directory exists
    const dir = dirname(outputFilePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    // Initialize or load tweets file
    const existingTweets: Tweet[] = existsSync(outputFilePath)
        ? JSON.parse(readFileSync(outputFilePath, "utf-8"))
        : [];

    // Navigate to initial tweet
    await page.goto(`https://x.com/${author || "Recuenco"}/status/${tweetId}`);
    await page.waitForSelector('div[data-testid="tweetText"]', {
        timeout: 10000,
    });

    try {
        await rejectCookies(page);
    } catch (error) {
        console.log("Cookie popup not found or already handled:", error);
    }

    // Get the author if not provided
    let currentAuthor = author;
    if (!currentAuthor) {
        const tweet = await parseTweet({ page });
        currentAuthor = tweet.author;
        console.log("Author detected:", currentAuthor);
    }

    const tweets: Tweet[] = [];

    while (true) {
        try {
            // Wait for tweet content to be fully loaded
            await page.waitForSelector('div[data-testid="tweetText"]', {
                timeout: 10000,
                visible: true,
            });
            await page.waitForSelector('div[role="progressbar"]', {
                hidden: true,
                timeout: 10000,
            });

            // Get current tweet data
            const { tweet, mustStop } = await fetchSingleTweet({
                page,
                expectedAuthor: currentAuthor!,
            });

            tweets.push(tweet);
            console.log(`Fetched tweet: ${tweet.url}`);

            if (mustStop) {
                console.log(
                    "Reached end of thread (different author detected)",
                );
                break;
            }

            try {
                await navigateToNextTweet(page);
                continue;
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === "Next tweet button not found"
                ) {
                    console.log("End of thread reached - no more tweets");
                    break;
                }
                throw error; // Re-throw other navigation errors
            }
        } catch (error) {
            console.error("Error processing tweet:", error);
            break;
        }
    }

    // Save all tweets
    if (tweets.length > 0) {
        existingTweets.push(tweets);
        writeFileSync(outputFilePath, JSON.stringify(existingTweets, null, 4));
        console.log(
            `Successfully saved ${tweets.length} tweets to ${outputFilePath}`,
        );
    }
}
