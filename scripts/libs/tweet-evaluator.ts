import type { Page } from "puppeteer-core";
import { Tweet, TweetMetadata } from "./types";

export async function evaluateTweetText(page: Page): Promise<string> {
    return await page.evaluate(() => {
        const tweetText = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"] div[data-testid="tweetText"]',
        )?.textContent;
        console.log("Found tweet text:", tweetText);
        return tweetText || "";
    });
}

export async function evaluateTweetMetadata(
    page: Page,
): Promise<TweetMetadata> {
    return await page.evaluate(() => {
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
}

export async function evaluateTweetTime(page: Page): Promise<string> {
    return await page.evaluate(() => {
        const timeElement = document.querySelector(
            'article[tabindex="-1"][role="article"][data-testid="tweet"] time',
        ) as HTMLTimeElement | null;
        return timeElement?.dateTime || "";
    });
}

export async function evaluateTweetStats(
    page: Page,
): Promise<Record<string, string>> {
    return await page.evaluate(() => {
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
}
