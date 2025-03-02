import type { Page } from "puppeteer-core";
import { Tweet, TweetStats } from "./types.ts";

async function extractTweetText(page: Page): Promise<string> {
    const tweetText = await page.evaluate(() => {
        const tweetTextElement = document.querySelector(
            'div[data-testid="tweetText"]',
        );
        return tweetTextElement ? tweetTextElement.textContent || "" : "";
    });
    return tweetText;
}

async function extractTweetStats(page: Page): Promise<TweetStats> {
    return await page.evaluate(() => {
        const stats: TweetStats = {
            replies: 0,
            retweets: 0,
            likes: 0,
            views: 0,
        };

        const statsElements = document.querySelectorAll(
            'a[role="link"] span[data-testid="app-text-transition-container"]',
        );
        statsElements.forEach((element) => {
            const text = element.textContent || "";
            const value = parseInt(text.replace(/,/g, "")) || 0;
            const parentLink = element.closest('a[role="link"]');

            if (parentLink) {
                const ariaLabel = parentLink.getAttribute("aria-label") || "";
                if (ariaLabel.includes("repl")) stats.replies = value;
                else if (ariaLabel.includes("Retweet")) stats.retweets = value;
                else if (ariaLabel.includes("Like")) stats.likes = value;
                else if (ariaLabel.includes("View")) stats.views = value;
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

export async function parseTweet({ page }: { page: Page }): Promise<Tweet> {
    const [text, stats, time, authorUrl] = await Promise.all([
        extractTweetText(page),
        extractTweetStats(page),
        extractTweetTime(page),
        extractAuthorUrl(page),
    ]);

    const author = authorUrl.split("/")[1] || "";

    return {
        text,
        stats,
        time,
        author,
        url: page.url(),
    };
}
