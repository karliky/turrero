/**
 * Specialized utilities for tweet enrichment operations
 * Reduces complexity in tweets_enrichment.ts
 */

import cheerio from 'cheerio';
import type { Page } from 'puppeteer';
import type { 
    ImageMetadata, 
    TweetMetadataType,
    ScriptLogger,
    EnrichedTweetData
} from '@/infrastructure/types/index.ts';

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
        const response = await fetch(url);
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

    async process(tweet: TweetForEnrichment, url: string, page: Page): Promise<void> {
        if (!page) {
            throw new Error('Page instance required for GoodReads processing');
        }
        
        await Promise.all([
            page.goto(url), 
            page.waitForNavigation(), 
            page.waitForSelector('h1')
        ]);
        
        const title = await page.evaluate(() => document.querySelector('h1')?.textContent);
        tweet.metadata.media = "goodreads";
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
        const response = await fetch(url);
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
        const response = await fetch(url);
        const data = await response.text();
        const $ = cheerio.load(data);
        
        tweet.metadata.media = "linkedin";
        tweet.metadata.title = $('h1').text().trim();
        tweet.metadata.description = $('meta[name=description]').attr('content') || '';
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
        new LinkedInProcessor()
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

/**
 * Downloads media with standardized configuration (Deno implementation)
 */
export async function downloadMedia(
    imageUrl: string, 
    config: DownloadConfig = { directory: "./metadata" }
): Promise<string> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Extract filename from URL or generate one
    const url = new URL(imageUrl);
    const filename = url.pathname.split('/').pop() || `image_${Date.now()}.jpg`;
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
        const response = await fetch(shortUrl, { redirect: 'follow' });
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
        const filePath = await downloadMedia(tweet.metadata.img!);
        
        delete tweet.metadata.embed;
        tweet.metadata.img = filePath;
        tweet.metadata.type = 'image' as TweetMetadataType;
        
        if (onSave) onSave(tweet);
    }

    private async processImageWithUrlTweet(
        tweet: TweetForEnrichment, 
        page?: Page,
        onSave?: (tweet: TweetForEnrichment) => void
    ): Promise<void> {
        const [filePath, url] = await Promise.all([
            downloadMedia(tweet.metadata.img!),
            expandUrl(tweet.metadata.url)
        ]);
        
        tweet.metadata.img = filePath;
        if (url) {
            tweet.metadata.url = url;
            // Clean tweet content when we have a URL
            await this.mediaRegistry.processKnownDomain(tweet, url, page);
        }
        
        if (onSave) onSave(tweet);
    }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Checks if a tweet should be enriched
 */
export function shouldEnrichTweet(tweet: TweetForEnrichment, enrichments: EnrichedTweetData[]): boolean {
    if (!tweet.metadata) return false;
    
    const { embed } = tweet.metadata;
    const alreadyEnriched = enrichments.find((_tweet: EnrichedTweetData) => 
        tweet.id === _tweet.id || (embed && embed.id === _tweet.id)
    );
    
    return !alreadyEnriched;
}

/**
 * Validates tweet metadata type
 */
export function isValidMetadataType(type?: string): boolean {
    return type !== undefined && type !== null;
}