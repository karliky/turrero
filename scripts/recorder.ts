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
import type { Browser, CookieParam, Page } from "puppeteer-core";
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
    imgs?: Array<{ img: string; url: string; video?: string }>;
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
        video?: string;
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

// --- GraphQL video URL interception ---
// X.com uploaded videos use blob: URLs in the DOM which are useless for playback.
// The real MP4 URLs are only in GraphQL API responses (extended_entities.media[].video_info.variants).
// We intercept these responses and cache the URLs keyed by media_id_str.
const interceptedVideoUrls = new Map<string, string>();
const interceptedCardUrls = new Map<string, string>(); // tweetId → expanded YouTube/card URL

/**
 * Recursively walks a GraphQL JSON response looking for video media entries
 * with extended_entities.media[].video_info.variants, and caches the best
 * MP4 URL keyed by media_id_str.
 */
function extractVideoUrlsFromGraphQL(obj: unknown): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractVideoUrlsFromGraphQL(item);
        }
        return;
    }

    const record = obj as Record<string, unknown>;

    // Check if this object looks like a media entry with video_info
    // X.com GraphQL uses `id_str` (not `media_id_str`) for the media ID
    const mediaId = (record.id_str ?? record.media_id_str) as string | undefined;
    if (
        mediaId &&
        typeof mediaId === 'string' &&
        (record.type === 'video' || record.type === 'animated_gif') &&
        record.video_info &&
        typeof record.video_info === 'object'
    ) {
        const videoInfo = record.video_info as Record<string, unknown>;
        const variants = videoInfo.variants;
        if (Array.isArray(variants)) {
            const mp4Variants = variants
                .filter((v): v is Record<string, unknown> =>
                    typeof v === 'object' && v !== null &&
                    (v as Record<string, unknown>).content_type === 'video/mp4' &&
                    typeof (v as Record<string, unknown>).bitrate === 'number'
                )
                .sort((a, b) => (b.bitrate as number) - (a.bitrate as number));

            if (mp4Variants.length > 0 && typeof mp4Variants[0]!.url === 'string') {
                interceptedVideoUrls.set(mediaId, mp4Variants[0]!.url as string);
                logger.debug(`Intercepted video URL for media ${mediaId}: ${(mp4Variants[0]!.url as string).slice(0, 80)}...`);
            }
        }
    }

    // Recurse into all values
    for (const value of Object.values(record)) {
        extractVideoUrlsFromGraphQL(value);
    }
}

/**
 * Recursively walks a GraphQL JSON response looking for tweet entities with
 * YouTube/youtu.be URLs, and caches the expanded URL keyed by tweet id_str/rest_id.
 */
function extractCardUrlsFromGraphQL(obj: unknown): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractCardUrlsFromGraphQL(item);
        }
        return;
    }

    const record = obj as Record<string, unknown>;

    // Look for tweet-like objects with rest_id/id_str and entities.urls
    const tweetId = (record.rest_id ?? record.id_str) as string | undefined;
    if (tweetId && typeof tweetId === 'string') {
        const legacy = record.legacy as Record<string, unknown> | undefined;
        const entities = (legacy?.entities ?? record.entities) as Record<string, unknown> | undefined;
        const urls = entities?.urls as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(urls)) {
            for (const urlEntry of urls) {
                const expanded = urlEntry.expanded_url as string | undefined;
                if (expanded && typeof expanded === 'string' &&
                    (expanded.includes('youtube.com') || expanded.includes('youtu.be'))) {
                    interceptedCardUrls.set(tweetId, expanded);
                    logger.debug(`Intercepted card URL for tweet ${tweetId}: ${expanded}`);
                }
            }
        }
    }

    // Recurse into all values
    for (const value of Object.values(record)) {
        extractCardUrlsFromGraphQL(value);
    }
}

/**
 * Extracts the numeric media ID from a Twitter video poster/thumbnail URL.
 * - ext_tw_video_thumb/1948986741710278656/pu/img/... → "1948986741710278656"
 * - tweet_video_thumb/1234567890 → "1234567890" (strip non-numeric suffix)
 */
function extractMediaIdFromPoster(posterUrl: string): string | undefined {
    // Uploaded videos: ext_tw_video_thumb/{numeric_id}/...
    const extMatch = posterUrl.match(/ext_tw_video_thumb\/(\d+)/);
    if (extMatch?.[1]) return extMatch[1];

    // GIF videos: tweet_video_thumb/{id} — id may have non-numeric chars
    const gifMatch = posterUrl.match(/tweet_video_thumb\/([^?/]+)/);
    if (gifMatch?.[1]) return gifMatch[1].replace(/\.[^.]+$/, '');

    return undefined;
}

/**
 * Polls the interceptedVideoUrls cache for a media ID, with timeout.
 * GraphQL responses may arrive slightly after DOM evaluation completes.
 */
async function waitForInterceptedVideo(mediaId: string, timeoutMs = 3000): Promise<string | undefined> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const url = interceptedVideoUrls.get(mediaId);
        if (url) return url;
        await new Promise(r => setTimeout(r, 200));
    }
    return undefined;
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

/**
 * Creates and configures a new page with cookies, device emulation, and GraphQL response interceptor.
 */
async function setupPage(browser: Browser, cookies: CookieParam[]): Promise<Page> {
    const page = await browser.newPage();
    await page.setCookie(...cookies);
    await page.emulate(iPhone12);

    page.on('response', async (response) => {
        const url = response.url();
        if (!url.includes('/graphql/')) return;
        try {
            const json = await response.json();
            extractVideoUrlsFromGraphQL(json);
            extractCardUrlsFromGraphQL(json);
        } catch {
            // Skip non-JSON responses (e.g. 204, binary)
        }
    });

    return page;
}

async function parseTweet({ page }: { page: Page }): Promise<Tweet> {
    /**
     * Wait for progress bar to disappear — use race with timeout so frame detach doesn't crash
     */
    await new Promise((r) => setTimeout(r, 100));
    logger.debug("Waiting for progress bar");
    await Promise.race([
        page.waitForSelector('div[role="progressbar"]', { hidden: true, timeout: 10000 }).catch(() => {}),
        new Promise((r) => setTimeout(r, 3000)),
    ]);

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
            const linkElement = (card.querySelector("a[href]") || card.closest("a[href]")) as HTMLAnchorElement;

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
                    return {
                        img: video.poster || "",
                        url: `${tweetUrl}/photo/${index + 1}`,
                        video: video.src || "",
                    };
                }

                return null;
            })
            .filter((item): item is { img: string; url: string; video?: string } => item !== null && item.img !== "");

        // On mobile, uploaded videos are NOT inside tweetPhoto — they're in standalone videoPlayer containers.
        // Check for these if no media was found via tweetPhoto.
        if (imgs.length === 0) {
            const videoPlayers = article.querySelectorAll('div[data-testid="videoPlayer"]');
            const mainVideoPlayers = Array.from(videoPlayers).filter(
                el => !embeddedContainer || !embeddedContainer.contains(el)
            );
            for (const vp of mainVideoPlayers) {
                const video = vp.querySelector('video') as HTMLVideoElement;
                if (video && video.poster) {
                    imgs.push({
                        img: video.poster,
                        url: `${tweetUrl}/video/1`,
                        video: video.src || "",
                    });
                }
            }
        }

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
        let embedVideo = "";
        const embedTweetPhoto = embeddedTweetContainer.querySelector('div[data-testid="tweetPhoto"]');
        if (embedTweetPhoto) {
            const video = embedTweetPhoto.querySelector('video') as HTMLVideoElement;
            if (video) {
                embedImg = video.poster || "";
                embedVideo = video.src || "";
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
            ...(embedVideo ? { video: embedVideo } : {}),
        } : null;
    });

    if (embedData) {
        metadata.embed = embedData;
        logger.debug(`Detected embedded tweet: ${embedData.id} from ${embedData.author}`);
    }

    // --- Post-process: replace blob: URLs with intercepted real video URLs ---
    if (metadata.imgs) {
        for (const img of metadata.imgs) {
            // Clear useless blob: URLs
            if (img.video?.startsWith('blob:')) {
                delete img.video;
            }
            // Try to resolve video URL from GraphQL interceptor
            if (!img.video && img.img) {
                const mediaId = extractMediaIdFromPoster(img.img);
                if (mediaId) {
                    const resolved = interceptedVideoUrls.get(mediaId)
                        ?? await waitForInterceptedVideo(mediaId, 3000);
                    if (resolved) {
                        img.video = resolved;
                        logger.debug(`Resolved video for media ${mediaId}: ${resolved.slice(0, 80)}...`);
                    }
                }
            }
        }
    }
    if (metadata.embed) {
        if (metadata.embed.video?.startsWith('blob:')) {
            delete metadata.embed.video;
        }
        if (!metadata.embed.video && metadata.embed.img) {
            const mediaId = extractMediaIdFromPoster(metadata.embed.img);
            if (mediaId) {
                const resolved = interceptedVideoUrls.get(mediaId)
                    ?? await waitForInterceptedVideo(mediaId, 3000);
                if (resolved) {
                    metadata.embed.video = resolved;
                    logger.debug(`Resolved embed video for media ${mediaId}: ${resolved.slice(0, 80)}...`);
                }
            }
        }
    }

    // Post-process card URLs: fill empty card URLs from GraphQL interceptor
    if (metadata.type === 'card' && !metadata.url && metadata.domain) {
        const graphqlUrl = interceptedCardUrls.get(currentTweetId);
        if (graphqlUrl) {
            (metadata as Record<string, unknown>).url = graphqlUrl;
            logger.debug(`Resolved card URL for tweet ${currentTweetId}: ${graphqlUrl}`);
        }
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
            const errMsg = error instanceof Error
                ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
                : String(error);
            if (errMsg.includes("detached") || errMsg.includes("Connection closed") || errMsg.includes("Navigating frame")) {
                throw new Error(`Navigation to thread ${tweetId} failed — frame detached`);
            }
            throw error;
        }

        logger.debug("Waiting for selector");
        try {
            await page.waitForSelector('div[data-testid="tweetText"]');
        } catch (error) {
            const errMsg = error instanceof Error
                ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
                : String(error);
            if (errMsg.includes("detached") || errMsg.includes("Connection closed")) {
                throw new Error(`Wait for tweetText in thread ${tweetId} failed — frame detached`);
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
                const errMsg = error instanceof Error
                    ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
                    : String(error);
                if (errMsg.includes("detached") || errMsg.includes("Connection closed")) {
                    logger.error("Fetch tweet failed - page detached or connection closed:", errMsg);
                    throw new Error(`Frame detached mid-thread at fetchSingleTweet`);
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

                // Wait for any loading spinner to finish — but don't crash if frame detaches
                await Promise.race([
                    page.waitForSelector('div[role="progressbar"]', { hidden: true, timeout: 10000 }).catch(() => {}),
                    new Promise((r) => setTimeout(r, 3000)),
                ]);

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
                    page.waitForSelector('div[role="progressbar"]', { hidden: true, timeout: 10000 }).catch(() => {}),
                    new Promise((r) => setTimeout(r, 4000)),
                ]);
            } catch (error) {
                logger.error("Navigation error:", error);

                const errorMsg = error instanceof Error
                    ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
                    : String(error);
                const isDetached = errorMsg.includes("detached") ||
                    errorMsg.includes("Connection closed") ||
                    errorMsg.includes("Target closed");

                if (isDetached || page.isClosed()) {
                    logger.warn("Page detached — throwing to trigger retry with fresh browser.");
                    throw new Error(`Frame detached mid-thread ${tweetIds[threadIndex]} at tweet ${tweets.length}`);
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

    // Suppress uncatchable Puppeteer CDP JSON parse errors (Chrome sends malformed
    // CDP messages for certain large GraphQL responses — crashes Connection.onMessage).
    // These are non-fatal: the response interceptor simply misses that one response.
    process.on("unhandledRejection", (reason: unknown) => {
        if (reason instanceof SyntaxError && String(reason).includes("Bad escaped character")) {
            logger.warn("CDP JSON parse error (non-fatal, suppressed):", (reason as Error).message);
            return;
        }
        // Re-throw anything else
        throw reason;
    });

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

    const cookies: CookieParam[] = [
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

    page = await setupPage(browser, cookies);

    try {
        if (testMode) {
            const tweetId = args[testIndex + 1];
            if (!tweetId) {
                logger.error("Please provide a tweet ID after --test");
                process.exit(1);
            }

            const testUrl = `https://x.com/Recuenco/status/${tweetId}`;
            await page.goto(testUrl, { waitUntil: 'networkidle2' });
            logger.debug("Waiting for selector");
            await page.waitForSelector('div[data-testid="tweetText"]');

            let tweet: Tweet;
            try {
                tweet = await parseTweet({ page });
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                if (errMsg.includes("detached") || errMsg.includes("Connection closed")) {
                    logger.warn("Frame detached on first attempt, retrying with fresh navigation...");
                    await page.goto(testUrl, { waitUntil: 'networkidle2' });
                    await page.waitForSelector('div[data-testid="tweetText"]');
                    tweet = await parseTweet({ page });
                } else {
                    throw error;
                }
            }

            try {
                await rejectCookies(page);
                logger.debug("Cookies rejected, closed the popup");
            } catch {
                logger.debug("Could not reject cookies and close the popup");
            }

            await fetchSingleTweet({ page, expectedAuthor: tweet.author });
            logger.info("Test result:", JSON.stringify(tweet, null, 2));
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

            // Track which tweets were already fixed (resumable — skip tweets with card URL already populated)
            const enrichedPath = join(__dirname, "../infrastructure/db/tweets_enriched.json");
            const enrichedBefore = JSON.parse(readFileSync(enrichedPath, "utf-8")) as Array<{ id: string; type?: string; url?: string }>;
            const alreadyFixed = new Set(
                enrichedBefore
                    .filter(e => e.type === "card" && e.url && e.url.length > 0)
                    .map(e => e.id)
            );

            const pendingTargets = targets.filter(t => !alreadyFixed.has(t.tweetId));
            logger.info(`Fixing ${pendingTargets.length} tweet(s) (${targets.length - pendingTargets.length} already have URLs, skipped)...`);

            const maxRetries = 3;
            let fixedCount = 0;
            const fixedIds = new Set<string>();

            // Navigate and re-parse each tweet — save after EVERY tweet for crash resilience
            for (const target of pendingTargets) {
                const oldTweet = data[target.threadIdx]![target.tweetIdx]!;
                logger.info(`[${fixedCount + 1}/${pendingTargets.length}] Re-scraping tweet ${target.tweetId} (was: "${oldTweet.tweet.slice(0, 60)}...")`);

                let newTweet: Tweet | undefined;
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        const tweetUrl = `https://x.com/Recuenco/status/${target.tweetId}`;
                        await page!.goto(tweetUrl, { waitUntil: 'networkidle2' });
                        await page!.waitForSelector('div[data-testid="tweetText"]');
                        try { await rejectCookies(page!); } catch { /* cookie popup not present */ }
                        newTweet = await parseTweet({ page: page! });
                        break;
                    } catch (error) {
                        const errMsg = error instanceof Error ? error.message : String(error);
                        const isFatal = errMsg.includes("detached") || errMsg.includes("Connection closed") || errMsg.includes("Target closed");
                        if (isFatal && attempt < maxRetries) {
                            logger.warn(`  Attempt ${attempt}/${maxRetries} failed, restarting browser...`);
                            await page!.close().catch(() => {});
                            await browser!.close().catch(() => {});
                            browser = await puppeteer.launch(launchOptions);
                            page = await setupPage(browser, cookies);
                            continue;
                        }
                        logger.error(`  Failed after ${attempt} attempts for tweet ${target.tweetId}: ${errMsg}`);
                        break;
                    }
                }

                if (newTweet) {
                    data[target.threadIdx]![target.tweetIdx] = newTweet;
                    fixedCount++;
                    fixedIds.add(target.tweetId);
                    logger.info(`  -> New: "${newTweet.tweet.slice(0, 60)}..." | metadata: ${newTweet.metadata.type ?? "none"} | url: ${newTweet.metadata.url || "(empty)"}`);

                    // Save after EVERY tweet — crash-resilient
                    const incTmp = tweetsPath + ".tmp";
                    writeFileSync(incTmp, JSON.stringify(data, null, 4));
                    renameSync(incTmp, tweetsPath);

                    // Also remove this tweet's enrichment immediately so it gets regenerated
                    const enrichedNow = JSON.parse(readFileSync(enrichedPath, "utf-8")) as Array<{ id: string }>;
                    const filtered = enrichedNow.filter((e) => e.id !== target.tweetId);
                    if (filtered.length < enrichedNow.length) {
                        const eTmp = enrichedPath + ".tmp";
                        writeFileSync(eTmp, JSON.stringify(filtered, null, 4));
                        renameSync(eTmp, enrichedPath);
                    }
                } else {
                    logger.warn(`  Skipped tweet ${target.tweetId} (all retries failed)`);
                }
            }

            logger.info(`Fixed ${fixedCount}/${pendingTargets.length} tweet(s)`);
            if (fixedCount > 0) {
                logger.info(`Run 'deno task enrich' to regenerate enrichments for fixed tweets`);
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
            const maxRetries = 6;
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
                    page = await setupPage(browser, cookies);
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
