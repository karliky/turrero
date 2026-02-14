/**
 * Specialized utilities for tweet enrichment operations
 * Reduces complexity in tweets_enrichment.ts
 */

import * as cheerio from 'cheerio';
import type { Page } from 'puppeteer';
import {
    TweetMetadataType,
    type ImageMetadata,
    type ScriptLogger,
    type EnrichedTweetData
} from '../../infrastructure/types/index.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure environment for safe operations
 */
export function configureEnvironment(): void {
    // We need to set this to avoid SSL errors when downloading images
    // Note: Deno has better TLS defaults, this is mainly for compatibility
    Deno.env.set('NODE_TLS_REJECT_UNAUTHORIZED', '0');
}

// ============================================================================
// TYPES
// ============================================================================

export interface TweetForEnrichment {
    id: string;
    metadata: {
        type?: TweetMetadataType | string;
        url?: string;
        img?: string;
        video?: string;
        title?: string;
        description?: string;
        media?: string;
        embed?: {
            id: string;
            author: string;
            tweet: string;
        };
        imgs?: ImageMetadata[];
        [key: string]: unknown;
    };
    tweet?: string;
}

export interface MediaProcessor {
    canProcess(url: string): boolean;
    process(tweet: TweetForEnrichment, url: string, page?: Page): Promise<void>;
}

// ============================================================================
// MEDIA PROCESSORS
// ============================================================================

/**
 * YouTube media processor
 */
export class YouTubeProcessor implements MediaProcessor {
    canProcess(url: string): boolean {
        return url.includes("youtube.com");
    }

    async process(tweet: TweetForEnrichment, url: string): Promise<void> {
        const response = await fetchWithTimeout(url);
        const data = await response.text();
        const $ = cheerio.load(data);
        
        tweet.metadata.media = "youtube";
        tweet.metadata.description = $('meta[name=description]').attr('content') || '';
        tweet.metadata.title = $('meta[name=title]').attr('content') || '';
    }
}

/**
 * GoodReads media processor
 */
export class GoodReadsProcessor implements MediaProcessor {
    canProcess(url: string): boolean {
        return url.includes("goodreads.com") && !url.includes("user_challenges");
    }

    async process(tweet: TweetForEnrichment, url: string, page?: Page): Promise<void> {
        tweet.metadata.media = "goodreads";

        // If scraper already captured domain and title, just fetch description if missing
        if (tweet.metadata.domain === 'goodreads.com' && tweet.metadata.title) {
            if (!tweet.metadata.description) {
                try {
                    const response = await fetchWithTimeout(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
                        redirect: 'follow',
                    });
                    if (response.ok) {
                        const html = await response.text();
                        const $ = cheerio.load(html);
                        const description =
                            $('meta[property="og:description"]').attr('content') ||
                            $('meta[name="description"]').attr('content') ||
                            '';
                        if (description.trim()) {
                            tweet.metadata.description = description.trim();
                        }
                    }
                } catch {
                    // Description is optional
                }
            }
            return;
        }

        if (!page) {
            throw new Error('Page instance required for GoodReads processing');
        }

        await Promise.all([
            page.goto(url),
            page.waitForNavigation(),
            page.waitForSelector('h1', { timeout: 30000 })
        ]);

        const title = await page.evaluate(() => document.querySelector('h1')?.textContent);
        tweet.metadata.title = title || '';
    }
}

/**
 * Wikipedia media processor
 */
export class WikipediaProcessor implements MediaProcessor {
    canProcess(url: string): boolean {
        return url.includes("wikipedia.org");
    }

    async process(tweet: TweetForEnrichment, url: string): Promise<void> {
        const response = await fetchWithTimeout(url);
        const data = await response.text();
        const $ = cheerio.load(data);
        
        tweet.metadata.media = "wikipedia";
        tweet.metadata.title = $('h1').text().trim();
        tweet.metadata.description = $("div[id=mw-content-text] p")
            .slice(0, 2)
            .map((_index, el) => $(el).text())
            .get()
            .join("")
            .trim();
        
        // Prevent ban from Wikipedia servers
        await new Promise(r => setTimeout(r, 1000));
    }
}

/**
 * LinkedIn media processor
 */
export class LinkedInProcessor implements MediaProcessor {
    canProcess(url: string): boolean {
        return url.includes("linkedin.com");
    }

    async process(tweet: TweetForEnrichment, url: string): Promise<void> {
        const response = await fetchWithTimeout(url);
        const data = await response.text();
        const $ = cheerio.load(data);
        
        tweet.metadata.media = "linkedin";
        tweet.metadata.title = $('h1').text().trim();
        tweet.metadata.description = $('meta[name=description]').attr('content') || '';
    }
}

/**
 * Generic card processor — fallback for any URL without a specialized processor.
 * Fetches og:description or meta description from the target page.
 */
export class GenericCardProcessor implements MediaProcessor {
    canProcess(_url: string): boolean {
        return true; // Fallback — catches everything not matched above
    }

    async process(tweet: TweetForEnrichment, url: string): Promise<void> {
        if (tweet.metadata.description) return; // Already has description

        try {
            const response = await fetchWithTimeout(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' },
                redirect: 'follow',
            });
            if (!response.ok) return;

            const html = await response.text();
            const $ = cheerio.load(html);

            const description =
                $('meta[property="og:description"]').attr('content') ||
                $('meta[name="description"]').attr('content') ||
                '';

            if (description.trim()) {
                tweet.metadata.description = description.trim();
            }
        } catch {
            // Silently skip — description is optional
        }
    }
}

// ============================================================================
// MEDIA PROCESSOR REGISTRY
// ============================================================================

export class MediaProcessorRegistry {
    private processors: MediaProcessor[] = [
        new YouTubeProcessor(),
        new GoodReadsProcessor(),
        new WikipediaProcessor(),
        new LinkedInProcessor(),
        new GenericCardProcessor() // Must be last — fallback for unmatched domains
    ];

    async processKnownDomain(tweet: TweetForEnrichment, url: string, page?: Page): Promise<void> {
        for (const processor of this.processors) {
            if (processor.canProcess(url)) {
                await processor.process(tweet, url, page);
                break;
            }
        }
    }
}

// ============================================================================
// MEDIA DOWNLOAD UTILITIES
// ============================================================================

export interface DownloadConfig {
    directory: string;
}

const FETCH_TIMEOUT_MS = 20000;

async function fetchWithTimeout(
    input: string,
    init?: RequestInit,
    timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Downloads media with standardized configuration (Deno implementation)
 */
export async function downloadMedia(
    imageUrl: string, 
    config: DownloadConfig = { directory: "./metadata" }
): Promise<string> {
    const response = await fetchWithTimeout(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image (${response.status}): ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Extract filename from URL or generate one
    const url = new URL(imageUrl);
    let filename = url.pathname.split('/').pop() || `image_${Date.now()}.jpg`;

    // Twitter image URLs store the format in query params (e.g. ?format=png&name=small)
    // Append as extension if the filename doesn't already have one
    if (!filename.includes('.')) {
        const format = url.searchParams.get('format') || 'jpg';
        filename = `${filename}.${format}`;
    }

    const filePath = `${config.directory}/${filename}`;
    
    // Ensure directory exists
    await Deno.mkdir(config.directory, { recursive: true });
    
    // Write file
    await Deno.writeFile(filePath, bytes);
    return filePath;
}

/**
 * Resolves and expands shortened URLs (Deno implementation)
 */
export async function expandUrl(shortUrl?: string): Promise<string | undefined> {
    if (!shortUrl) return undefined;
    
    try {
        const response = await fetchWithTimeout(shortUrl, { redirect: 'follow' });
        return response.url; // This will be the final URL after redirects
    } catch (error) {
        console.warn(`Failed to expand URL ${shortUrl}:`, error);
        return shortUrl; // Return original if expansion fails
    }
}

// ============================================================================
// ENRICHMENT STRATEGIES
// ============================================================================

export class TweetEnricher {
    private mediaRegistry: MediaProcessorRegistry;
    private logger: ScriptLogger;

    constructor(logger: ScriptLogger) {
        this.mediaRegistry = new MediaProcessorRegistry();
        this.logger = logger;
    }

    private async tryDownloadMedia(
        imageUrl: string,
        tweetId: string,
    ): Promise<string | undefined> {
        try {
            return await downloadMedia(imageUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Skipping image download for tweet ${tweetId}: ${message}`);
            return undefined;
        }
    }

    /**
     * Downloads and processes tweet media
     */
    async downloadTweetMedia(
        tweet: TweetForEnrichment, 
        page?: Page,
        onSave?: (tweet: TweetForEnrichment) => void
    ): Promise<void> {
        try {
            if (!tweet.metadata.img) {
                await this.processUrlOnlyTweet(tweet, page, onSave);
                return;
            }

            if (!tweet.metadata.url) {
                await this.processImageOnlyTweet(tweet, onSave);
                return;
            }

            await this.processImageWithUrlTweet(tweet, page, onSave);
        } catch (error) {
            this.logger.error("Failed to download tweet media:", error);
            throw error;
        }
    }

    private async processUrlOnlyTweet(
        tweet: TweetForEnrichment, 
        page?: Page,
        onSave?: (tweet: TweetForEnrichment) => void
    ): Promise<void> {
        const url = await expandUrl(tweet.metadata.url);
        if (url) {
            tweet.metadata.url = url;
            await this.mediaRegistry.processKnownDomain(tweet, url, page);
        }
        
        if (onSave) onSave(tweet);
    }

    private async processImageOnlyTweet(
        tweet: TweetForEnrichment,
        onSave?: (tweet: TweetForEnrichment) => void
    ): Promise<void> {
        // Derive GIF URL from poster before downloading (URL will be replaced with local path)
        if (!tweet.metadata.video && tweet.metadata.img) {
            const derived = deriveGifUrl(tweet.metadata.img);
            if (derived) tweet.metadata.video = derived;
        }

        const filePath = await this.tryDownloadMedia(tweet.metadata.img!, tweet.id);

        delete tweet.metadata.embed;
        if (filePath) {
            tweet.metadata.img = filePath;
        }
        if (tweet.metadata.type !== TweetMetadataType.CARD) {
            tweet.metadata.type = 'image' as TweetMetadataType;
        }

        if (onSave) onSave(tweet);
    }

    private async processImageWithUrlTweet(
        tweet: TweetForEnrichment, 
        page?: Page,
        onSave?: (tweet: TweetForEnrichment) => void
    ): Promise<void> {
        const [filePath, url] = await Promise.all([
            this.tryDownloadMedia(tweet.metadata.img!, tweet.id),
            expandUrl(tweet.metadata.url)
        ]);

        if (filePath) {
            tweet.metadata.img = filePath;
        }
        if (url) {
            tweet.metadata.url = url;
            // Clean tweet content when we have a URL
            await this.mediaRegistry.processKnownDomain(tweet, url, page);
        }
        
        if (onSave) onSave(tweet);
    }
}

// ============================================================================
// GIF DETECTION UTILITIES
// ============================================================================

/**
 * Checks if a URL is a blob: URL (useless outside the browser context).
 * Used as a safety net to prevent blob URLs from leaking into the database.
 */
export function isBlobUrl(url: string | undefined): boolean {
    return url?.startsWith('blob:') ?? false;
}

/**
 * Derives a GIF MP4 URL from a Twitter video poster thumbnail URL.
 * Poster URLs follow: pbs.twimg.com/tweet_video_thumb/{ID}?format=jpg&name=small
 * MP4 URLs follow:    video.twimg.com/tweet_video/{ID}.mp4
 */
export function deriveGifUrl(posterUrl: string): string | undefined {
    const match = posterUrl.match(/tweet_video_thumb\/([^?]+)/);
    if (!match?.[1]) return undefined;
    // If the ID already has an extension (e.g., GrIUe8_WAAAcQ2A.jpg), strip it
    const cleanId = match[1].replace(/\.[^.]+$/, '');
    return `https://video.twimg.com/tweet_video/${cleanId}.mp4`;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Checks if a tweet should be enriched.
 * Re-processes when: no enrichment yet; embed with id "unknown"; or has embed but no embed-type enrichment (e.g. only image so far).
 */
export function shouldEnrichTweet(tweet: TweetForEnrichment, enrichments: EnrichedTweetData[]): boolean {
    if (!tweet.metadata) return false;

    const allForThisTweet = enrichments.filter((_tweet: EnrichedTweetData) => _tweet.id === tweet.id);
    const hasEmbedEnrichment = allForThisTweet.some((e) => e.type === "embed");
    const hasUnknownEmbed = allForThisTweet.some(
        (e) => e.type === "embed" && (e.embeddedTweetId === "unknown" || !e.embeddedTweetId),
    );

    if (allForThisTweet.length === 0) return true;
    if (hasUnknownEmbed) return true;
    if (tweet.metadata.embed && !hasEmbedEnrichment) return true;
    return false;
}

/**
 * Validates tweet metadata type
 */
export function isValidMetadataType(type?: string): boolean {
    return type !== undefined && type !== null;
}
