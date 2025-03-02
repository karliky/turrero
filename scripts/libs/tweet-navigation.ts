import type { Page } from "puppeteer-core";
import { Tweet, TweetNavigationConfig } from "./types.ts";
import { parseTweet } from "./tweet-parser.ts";
import { rejectCookies } from "./cookie-handler.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export async function navigateToNextTweet(page: Page): Promise<void> {
    await page.waitForSelector(
        'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        { timeout: 5000 },
    );

    await Promise.all([
        page.waitForSelector('div[role="progressbar"]', { hidden: true }),
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
                        reject(new Error("Could not find current tweet"));
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
                        reject(new Error("Could not find cell div"));
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
                        reject(new Error("Could not find next tweet"));
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
    const { page, author, tweetIds, outputFilePath } = config;

    // Ensure the directory exists
    const dir = dirname(outputFilePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    // Initialize tweets.json if it doesn't exist
    if (!existsSync(outputFilePath)) {
        writeFileSync(outputFilePath, "[]", "utf-8");
    }

    for (const tweetId of tweetIds) {
        await page.goto(
            `https://x.com/${author || "Recuenco"}/status/${tweetId}`,
        );
        console.log("Waiting for selector");
        await page.waitForSelector('div[data-testid="tweetText"]');

        try {
            await rejectCookies(page);
            console.log("Cookies rejected, closed the popup");
        } catch (error) {
            console.log("Could not reject cookies and close the popup:", error);
        }

        let currentAuthor = author;
        if (currentAuthor === undefined) {
            const tweet = await parseTweet({ page });
            currentAuthor = tweet.author;
            console.log("Author found:", currentAuthor);
        }

        let stopped = false;
        const tweets: Tweet[] = [];

        while (!stopped) {
            try {
                const { tweet, mustStop } = await fetchSingleTweet({
                    page,
                    expectedAuthor: currentAuthor!,
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
                    break;
                }

                tweets.push(tweet);
                console.log("Finding next tweet...");

                try {
                    await navigateToNextTweet(page);
                } catch (error) {
                    if (
                        error instanceof Error &&
                        error.message === "Could not find next tweet"
                    ) {
                        console.error(
                            "\nNo more tweets found in the thread. Stack trace:",
                        );
                        console.error(error.stack);
                        console.log(
                            "\nTip: Try running in test mode to see the browser:",
                        );
                        console.log(
                            `deno run --allow-all scripts/recorder.ts --id ${tweetId} --test`,
                        );

                        // Save what we have so far
                        const existingTweets = JSON.parse(
                            readFileSync(outputFilePath, "utf-8"),
                        );
                        existingTweets.push(tweets);
                        writeFileSync(
                            outputFilePath,
                            JSON.stringify(existingTweets, null, 4),
                        );

                        // Exit gracefully
                        return;
                    }
                    // For other errors, try to recover
                    console.error("Navigation error:", error);
                    await handleNavigationError(page);
                }
            } catch (error) {
                console.error("Tweet processing error:", error);
                await handleNavigationError(page);
            }
        }
    }
}
