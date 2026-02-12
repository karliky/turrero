/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import dotenv from "dotenv";
import { dirname } from "@std/path";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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

// --- Incremental save & completion tracking ---

const completedPath = join(__dirname, "../infrastructure/db/.scrape_completed.json");

function saveThreadProgress(
    outputFilePath: string,
    threadId: string,
    threadTweets: Tweet[],
): void {
    const data: Tweet[][] = JSON.parse(readFileSync(outputFilePath, "utf-8"));
    const idx = data.findIndex((t) => t.length > 0 && t[0]?.id === threadId);
    if (idx !== -1) {
        data[idx] = threadTweets;
    } else {
        data.push(threadTweets);
    }
    const tmpPath = outputFilePath + ".tmp";
    writeFileSync(tmpPath, JSON.stringify(data, null, 4));
    renameSync(tmpPath, outputFilePath);
}

function loadCompleted(): Set<string> {
    if (!existsSync(completedPath)) return new Set();
    return new Set(JSON.parse(readFileSync(completedPath, "utf-8")) as string[]);
}

function markCompleted(threadId: string): void {
    const completed = loadCompleted();
    completed.add(threadId);
    writeFileSync(completedPath, JSON.stringify([...completed], null, 2));
}

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
        url?: string;
        img?: string;
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
 * Parse a single CSV line respecting double-quoted fields (commas inside quotes don't split).
 * RFC 4180-style: "field" can contain commas; "" inside a field is escaped quote.
 */
function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let i = 0;
    while (i < line.length) {
        if (line[i] === '"') {
            let field = "";
            i++;
            while (i < line.length) {
                if (line[i] === '"') {
                    if (line[i + 1] === '"') {
                        field += '"';
                        i += 2;
                    } else {
                        i++;
                        break;
                    }
                } else {
                    field += line[i];
                    i++;
                }
            }
            fields.push(field.trim());
        } else {
            const comma = line.indexOf(",", i);
            const end = comma === -1 ? line.length : comma;
            fields.push(line.slice(i, end).trim());
            i = comma === -1 ? line.length : comma + 1;
        }
    }
    return fields;
}

/**
 * Parse CSV file into an array of objects.
 * Handles quoted fields so content with commas does not break the row.
 * @param filePath Path to the CSV file.
 * @returns Array of objects where each object represents a row in the CSV.
 */
function parseCSV(filePath: string): TweetCSV[] {
    const csvContent = readFileSync(filePath, { encoding: "utf8" });
    const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
        throw new Error("CSV file is empty");
    }
    const headerNames = parseCSVLine(lines[0]!).map((h) => h.trim());
    return lines.slice(1).map((line: string) => {
        const data = parseCSVLine(line);
        const obj = headerNames.reduce(
            (
                acc: { [key: string]: string },
                nextKey: string,
                index: number,
            ) => {
                acc[nextKey] = data[index]?.trim() ?? "";
                return acc;
            },
            { id: "" },
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
    try {
        await page.waitForSelector('div[role="progressbar"]', {
            hidden: true,
            timeout: 30000 // 30 seconds timeout to prevent infinite waiting
        });
    } catch (error) {
        if (error instanceof Error &&
            (error.message.includes("detached") || error.message.includes("Connection closed"))) {
            throw new Error("Page detached or connection closed while waiting for progress bar");
        }
        throw error;
    }

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

            // Detect media type from domain
            let media = undefined;
            if (domain) {
                const domainLower = domain.toLowerCase();
                if (domainLower.includes('goodreads')) {
                    media = 'goodreads';
                } else if (domainLower.includes('youtube') || domainLower.includes('youtu.be')) {
                    media = 'youtube';
                } else if (domainLower.includes('amazon')) {
                    media = 'amazon';
                }
            }

            return {
                type: 'card',
                media: media,
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
        // Exclude tweetPhotos inside the embedded tweet container (div[aria-labelledby])
        // to avoid misattributing embed media to the main tweet.
        // We find the specific embed container first, then check containment —
        // using closest() would be too broad since ancestor elements may also have aria-labelledby.
        const allAriaContainers = article.querySelectorAll('div[aria-labelledby]');
        const embeddedContainer = Array.from(allAriaContainers).find(
            el => el.querySelector('div[data-testid="User-Name"]')
        ) ?? null;
        const allTweetPhotos = article.querySelectorAll('div[data-testid="tweetPhoto"]');
        const tweetPhotos = Array.from(allTweetPhotos).filter(
            el => !embeddedContainer || !embeddedContainer.contains(el)
        );
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
        const allEmbedCandidates = tweetContainer?.querySelectorAll('div[aria-labelledby]') ?? [];
        const embeddedTweetContainer = Array.from(allEmbedCandidates).find(
            el => el.querySelector('div[data-testid="User-Name"]')
        ) ?? null;

        if (!embeddedTweetContainer) return null;

        // Extract embed ID and URL from multiple possible sources
        // Try 1: Look for direct link with /status/ in href
        let embedId = "";
        let embedUrl = "";
        const embedLink = embeddedTweetContainer.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
        if (embedLink?.href) {
            embedUrl = embedLink.href;
            embedId = embedLink.href.split('/status/')[1]?.split('?')[0]?.split('/')[0] || "";
        }

        // Try 2: Look for clickable container with role="link" that might have the tweet
        if (!embedId) {
            const clickableContainer = embeddedTweetContainer.querySelector('div[role="link"][tabindex="0"]') as HTMLElement;
            if (clickableContainer) {
                // Try to extract URL from any anchor inside the clickable container
                if (!embedUrl) {
                    const anyLink = clickableContainer.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
                    if (anyLink?.href) {
                        embedUrl = anyLink.href;
                    }
                }
                // The embed exists but we couldn't find the ID
                // Leave embedId empty rather than using a timestamp
                embedId = "";
            }
        }

        // Extract author from User-Name div
        // User-Name innerText format: "Full Name\n@handle\n·\ndate"
        const authorElement = embeddedTweetContainer.querySelector('div[data-testid="User-Name"]') as HTMLElement;
        const authorFullText = authorElement?.innerText || "";

        const authorLines = authorFullText.split('\n').map(l => l.trim()).filter(Boolean);
        const displayName = authorLines[0] || "";
        const handleMatch = authorFullText.match(/@(\w+)/);
        const authorHandle = handleMatch ? `@${handleMatch[1]}` : "";
        // Store as "Display Name\n@handle" for consistent rendering
        const authorDisplay = displayName && authorHandle
            ? `${displayName}\n${authorHandle}`
            : authorHandle || displayName;

        // Extract tweet text
        const tweetTextElement = embeddedTweetContainer.querySelector('div[data-testid="tweetText"]') as HTMLElement;
        const tweetText = tweetTextElement?.innerText || "";

        // Extract image/GIF from embedded tweet (if any)
        let embedImg = "";
        const embedTweetPhoto = embeddedTweetContainer.querySelector('div[data-testid="tweetPhoto"]');
        if (embedTweetPhoto) {
            const video = embedTweetPhoto.querySelector('video') as HTMLVideoElement;
            if (video) {
                embedImg = video.poster || video.src || "";
            } else {
                const img = embedTweetPhoto.querySelector('img') as HTMLImageElement;
                if (img) {
                    embedImg = img.src || "";
                }
            }
        }

        // Return embed data if we have text and author, even without full ID
        return (authorDisplay && tweetText) ? {
            type: "embed",
            id: embedId || "unknown",
            author: authorDisplay,
            tweet: tweetText,
            ...(embedUrl ? { url: embedUrl } : {}),
            ...(embedImg ? { img: embedImg } : {}),
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
    for (const [threadIndex, tweetId] of tweetIds.entries()) {
        const threadStart = Date.now();
        logger.info(`[${threadIndex + 1}/${tweetIds.length}] Starting thread ${tweetId}`);

        // Check if page is still valid before continuing
        if (page.isClosed()) {
            logger.warn("Page is closed, stopping scraping");
            break;
        }

        // --- Resume detection ---
        const existingData: Tweet[][] = JSON.parse(readFileSync(outputFilePath, "utf-8"));
        const existingThread = existingData.find((t) => t.length > 0 && t[0]?.id === tweetId);

        let tweets: Tweet[] = [];
        let initialUrl: string;

        if (existingThread && existingThread.length > 0) {
            const lastSaved = existingThread[existingThread.length - 1]!;
            tweets = [...existingThread];
            logger.info(`Resuming thread ${tweetId} from tweet ${tweets.length} (last: ${lastSaved.id})`);
            initialUrl = `https://x.com/${author || "Recuenco"}/status/${lastSaved.id}`;
        } else {
            initialUrl = `https://x.com/${author || "Recuenco"}/status/${tweetId}`;
        }

        try {
            await page.goto(initialUrl);
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
                markCompleted(tweetId);
                logger.info(`[${threadIndex + 1}/${tweetIds.length}] Thread ${tweetId} completed: ${tweets.length} tweets [${Math.round((Date.now() - threadStart) / 1000)}s]`);
                author = undefined;
                break;
            }

            // Dedup guard: skip if already saved (happens on resume — first iteration re-parses last saved tweet)
            if (!tweets.some((t) => t.id === tweet.id)) {
                tweets.push(tweet);
                saveThreadProgress(outputFilePath, tweetId, tweets);
                logger.info(`[${threadIndex + 1}/${tweetIds.length}] Tweet ${tweets.length} (${tweet.id}) [${Math.round((Date.now() - threadStart) / 1000)}s]`);
            }

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

                await page.waitForSelector('div[role="progressbar"]', {
                    hidden: true,
                    timeout: 30000
                });

                const navResult = await page.evaluate(() => {
                    return new Promise<{ clicked: boolean; endOfThread?: boolean }>((resolve) => {
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
                                resolve({ clicked: false });
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
                                resolve({ clicked: false });
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
                                resolve({ clicked: false, endOfThread: true });
                                return;
                            }

                            nextTweet.click();
                            resolve({ clicked: true });
                        };

                        tryClick();
                    });
                });

                if (navResult.endOfThread) {
                    logger.info("End of thread reached (no next tweet)");
                    markCompleted(tweetId);
                    logger.info(`[${threadIndex + 1}/${tweetIds.length}] Thread ${tweetId} completed: ${tweets.length} tweets [${Math.round((Date.now() - threadStart) / 1000)}s]`);
                    author = undefined;
                    break;
                }

                if (!navResult.clicked) {
                    throw new Error("Could not find next tweet or current tweet");
                }

                // X no hace navegación real al cambiar de tweet (SPA); esperar a que cargue el siguiente
                await Promise.race([
                    page.waitForSelector('div[role="progressbar"]', { hidden: true, timeout: 15000 }),
                    new Promise((r) => setTimeout(r, 4000)),
                ]);
            } catch (error) {
                logger.error("Navigation error:", error);

                const isDetached = error instanceof Error &&
                    (error.message.includes("detached") ||
                     error.message.includes("Connection closed") ||
                     error.message.includes("Target closed"));

                if (isDetached || page.isClosed()) {
                    logger.warn("Page detached — stopping thread (data already saved).");
                    stopped = true;
                    author = undefined;
                    break;
                }

                // Page still alive — try reload recovery
                await new Promise((resolve) => setTimeout(resolve, 2000));
                try {
                    await page.reload();
                    await page.waitForSelector(
                        'article[tabindex="-1"][role="article"][data-testid="tweet"]',
                        { timeout: 8000 },
                    );
                } catch (reloadErr) {
                    logger.error("Reload recovery failed", reloadErr);
                    stopped = true;
                    author = undefined;
                    break;
                }
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
    const fixTweetIndex = args.indexOf("--fix-tweet");
    const fixTweetMode = fixTweetIndex !== -1;

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
        : fixTweetMode
        ? {
            headless: true,
            slowMo: 100,
        }
        : {
            headless: true,
            slowMo: Math.floor(Math.random() * 150) + 750,
        };

    logger.info(testMode ? "Launching test mode..." : fixTweetMode ? "Launching fix-tweet mode..." : "Launching...");

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
        } else if (fixTweetMode) {
            const tweetIdsToFix = args.slice(fixTweetIndex + 1);
            if (tweetIdsToFix.length === 0) {
                logger.error("Provide one or more tweet IDs after --fix-tweet");
                process.exit(1);
            }

            const tweetsPath = join(__dirname, "../infrastructure/db/tweets.json");
            const data: Tweet[][] = JSON.parse(readFileSync(tweetsPath, "utf-8"));

            // Locate each tweet in the data structure
            const targets: Array<{ tweetId: string; threadIdx: number; tweetIdx: number }> = [];
            for (const id of tweetIdsToFix) {
                let found = false;
                for (let ti = 0; ti < data.length; ti++) {
                    const thread = data[ti]!;
                    const tweetIdx = thread.findIndex((t) => t.id === id);
                    if (tweetIdx !== -1) {
                        targets.push({ tweetId: id, threadIdx: ti, tweetIdx });
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    logger.error(`Tweet ${id} not found in any thread`);
                    process.exit(1);
                }
            }

            logger.info(`Fixing ${targets.length} tweet(s)...`);

            // Navigate and re-parse each tweet
            for (const target of targets) {
                const oldTweet = data[target.threadIdx]![target.tweetIdx]!;
                logger.info(`Re-scraping tweet ${target.tweetId} (was: "${oldTweet.tweet.slice(0, 60)}...")`);

                await page!.goto(`https://x.com/Recuenco/status/${target.tweetId}`);
                await page!.waitForSelector('div[data-testid="tweetText"]');

                try { await rejectCookies(page!); } catch { /* cookie popup not present */ }

                const newTweet = await parseTweet({ page: page! });
                data[target.threadIdx]![target.tweetIdx] = newTweet;

                logger.info(`  -> New: "${newTweet.tweet.slice(0, 60)}..." | metadata: ${newTweet.metadata.type ?? "none"}`);
            }

            // Atomic save
            const tmpPath = tweetsPath + ".tmp";
            writeFileSync(tmpPath, JSON.stringify(data, null, 4));
            renameSync(tmpPath, tweetsPath);
            logger.info(`Saved ${targets.length} fixed tweet(s) to tweets.json`);

            // Remove from enriched so enrichment picks them up fresh
            const enrichedPath = join(__dirname, "../infrastructure/db/tweets_enriched.json");
            const enriched = JSON.parse(readFileSync(enrichedPath, "utf-8")) as Array<{ id: string }>;
            const fixedIds = new Set(tweetIdsToFix);
            const remaining = enriched.filter((e) => !fixedIds.has(e.id));
            if (remaining.length < enriched.length) {
                const enrichedTmpPath = enrichedPath + ".tmp";
                writeFileSync(enrichedTmpPath, JSON.stringify(remaining, null, 4));
                renameSync(enrichedTmpPath, enrichedPath);
                logger.info(`Removed ${enriched.length - remaining.length} enrichment(s) — run 'deno task enrich' to regenerate`);
            }
        } else {
            const tweetsPath = join(__dirname, "../infrastructure/db/tweets.json");
            const outputFilePath = tweetsPath;

            // --- Handle --rescrape <threadId> ---
            const rescrapeIndex = args.indexOf("--rescrape");
            if (rescrapeIndex !== -1) {
                const threadId = args[rescrapeIndex + 1];
                if (!threadId) {
                    logger.error("Provide thread ID after --rescrape");
                    process.exit(1);
                }

                const tweetsData: Tweet[][] = JSON.parse(readFileSync(tweetsPath, "utf-8"));
                const idx = tweetsData.findIndex((t) => t.length > 0 && t[0]?.id === threadId);
                if (idx !== -1) {
                    const ids = tweetsData[idx]!.map((t) => t.id);
                    tweetsData.splice(idx, 1);
                    writeFileSync(tweetsPath, JSON.stringify(tweetsData, null, 4));

                    const enrichedPath = join(__dirname, "../infrastructure/db/tweets_enriched.json");
                    const enriched = JSON.parse(readFileSync(enrichedPath, "utf-8")) as Array<{ id: string }>;
                    const idSet = new Set(ids);
                    const filtered = enriched.filter((e) => !idSet.has(e.id));
                    writeFileSync(enrichedPath, JSON.stringify(filtered, null, 4));
                    logger.info(`Removed thread ${threadId}: ${ids.length} tweets + ${enriched.length - filtered.length} enrichments`);
                } else {
                    logger.info(`Thread ${threadId} not found in tweets.json — will scrape as new`);
                }

                const completedSet = loadCompleted();
                completedSet.delete(threadId);
                writeFileSync(completedPath, JSON.stringify([...completedSet], null, 2));
                logger.info(`Cleared completion flag for ${threadId}`);
                // Falls through to normal scrape — picked up as "new"
            }

            const existingTweetsData: Tweet[][] = JSON.parse(
                readFileSync(tweetsPath, "utf-8"),
            );
            const csvTweets = parseCSV(
                join(__dirname, "../infrastructure/db/turras.csv"),
            );

            logger.debug("Total tweets in CSV:", csvTweets.length);
            const emptyIds = csvTweets.filter((t) => !t.id || t.id.trim() === "");
            if (emptyIds.length > 0) {
                logger.warn("Found tweets with empty IDs in CSV:", emptyIds.length);
                emptyIds.forEach((tweet, index) => {
                    logger.warn(`Empty ID tweet ${index + 1}:`, JSON.stringify(tweet, null, 2));
                });
            }

            const existingTweets = existingTweetsData.reduce(
                (acc: string[], threads: Tweet[]) => {
                    if (threads && threads.length > 0 && threads[0]) {
                        acc.push(threads[0].id);
                    }
                    return acc;
                },
                [],
            );

            // Bootstrap: first time, seed completed set from existing threads
            if (!existsSync(completedPath)) {
                const allExistingIds = existingTweetsData
                    .filter((t: Tweet[]) => t.length > 0)
                    .map((t: Tweet[]) => t[0]!.id);
                writeFileSync(completedPath, JSON.stringify(allExistingIds, null, 2));
                logger.info(`Bootstrap: marked ${allExistingIds.length} existing threads as completed`);
            }

            const completed = loadCompleted();

            const allCsvIds = csvTweets
                .map((tweet) => tweet.id)
                .filter((id) => id && id.trim() !== "");

            const newIds = allCsvIds.filter(
                (id) => !existingTweets.includes(id),
            );
            const incompleteIds = allCsvIds.filter(
                (id) => existingTweets.includes(id) && !completed.has(id),
            );
            const tweetIds = [...incompleteIds, ...newIds];

            logger.info(`Threads — new: ${newIds.length}, resume: ${incompleteIds.length}, done: ${completed.size}`);

            if (tweetIds.length > 0) {
                logger.info("Tweet IDs to process:", tweetIds);
            } else {
                logger.info(
                    "No tweets to process - all threads are up to date",
                );
            }

            let idsToProcess = tweetIds;
            const maxRetries = 3;
            let attempt = 0;

            while (idsToProcess.length > 0 && attempt < maxRetries) {
                try {
                    await getAllTweets({
                        page: page!,
                        author: undefined,
                        tweetIds: idsToProcess,
                        outputFilePath,
                    });
                    break;
                } catch (err) {
                    attempt++;
                    logger.warn("getAllTweets failed (attempt %s/%s):", attempt, maxRetries, err);
                    if (page) {
                        await page.close().catch(() => {});
                        page = undefined;
                    }
                    if (browser) {
                        await browser.close().catch(() => {});
                        browser = undefined;
                    }
                    if (attempt >= maxRetries) {
                        logger.error("Max retries reached, stopping.");
                        throw err;
                    }
                    // Re-check completed set for threads that finished before crash
                    const updatedCompleted = loadCompleted();
                    idsToProcess = idsToProcess.filter((id) => !updatedCompleted.has(id));
                    logger.info("Retrying with %s remaining threads", idsToProcess.length);
                    browser = await puppeteer.launch(launchOptions);
                    page = await browser.newPage();
                    await page.setCookie(...cookies);
                    await page.emulate(iPhone12);
                }
            }
        }
    } finally {
        logger.info("Closing browser and page...");
        if (page) {
            await page.close().catch((err) => {
                logger.debug("Page close (ignored):", err?.message ?? err);
            });
            page = undefined;
        }
        if (browser) {
            await browser.close().catch((err) => {
                logger.debug("Browser close (ignored):", err?.message ?? err);
            });
            browser = undefined;
        }
    }
}

main().catch((error) => {
    const logger = createDenoLogger("recorder");
    logger.error("Main function error:", error);
});
