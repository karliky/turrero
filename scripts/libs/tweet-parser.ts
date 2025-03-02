import type { Page } from "puppeteer-core";
import { Tweet, TweetStats } from "./types.ts";

async function extractTweetText(page: Page): Promise<string> {
    // Wait for progress bar to disappear
    await page.waitForSelector('div[role="progressbar"]', { hidden: true });
    return await page.evaluate(() => {
        try {
            const tweetContainer = document.querySelector(
                'article[tabindex="-1"][role="article"][data-testid="tweet"]',
            );
            if (!tweetContainer) return "";

            const tweetText = tweetContainer.querySelector(
                'div[data-testid="tweetText"]',
            );
            if (!tweetText) return "";

            return tweetText.textContent || "";
        } catch {
            return "";
        }
    });
}

async function extractTweetStats(page: Page): Promise<TweetStats> {
    return await page.evaluate(() => {
        const stats: TweetStats = {
            replies: 0,
            retweets: 0,
            likes: 0,
            views: 0,
        };

        const statsLabel = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"]',
        )?.querySelector('div[role="group"]')?.getAttribute("aria-label")
            ?.toLowerCase() || "";

        const statsKeyMap: Record<string, keyof TweetStats> = {
            reply: "replies",
            replies: "replies",
            repost: "retweets",
            reposts: "retweets",
            like: "likes",
            likes: "likes",
            view: "views",
            views: "views",
        };

        const segments = statsLabel.split(",");
        segments.forEach((segment) => {
            const match = segment.trim().match(/(\d+)\s(\w+)/);
            if (match) {
                const [, value, key] = match;
                const mappedKey = statsKeyMap[key];
                if (mappedKey) {
                    stats[mappedKey] = parseInt(value.replace(/,/g, "")) || 0;
                }
            }
        });

        return stats;
    });
}

async function extractTweetTime(page: Page): Promise<string> {
    return await page.evaluate(() => {
        const timeElement = document.querySelector("time");
        return timeElement ? timeElement.getAttribute("datetime") || "" : "";
    });
}

async function extractAuthorUrl(page: Page): Promise<string> {
    return await page.evaluate(() => {
        const authorElement = document.querySelector(
            'div[data-testid="User-Name"] a',
        );
        return authorElement ? authorElement.getAttribute("href") || "" : "";
    });
}

export function extractTweetId(url: string): string {
    const match = url.match(/\/status\/(\d+)(?!\?)/);
    return match ? match[1] : "";
}

export async function parseTweet({ page }: { page: Page }): Promise<Tweet> {
    const [text, stats, time, authorUrl] = await Promise.all([
        extractTweetText(page),
        extractTweetStats(page),
        extractTweetTime(page),
        extractAuthorUrl(page),
    ]);

    const author = authorUrl.split("/")[1] || "";

    return {
        id: extractTweetId(page.url()),
        text,
        stats,
        time,
        author,
        url: page.url(),
    };
}
