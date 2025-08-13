/**
 * Specialized utilities for tweet enrichment operations
 * Reduces complexity in tweets_enrichment.ts
 */

import fetch from 'node-fetch';
import cheerio from 'cheerio';
import Downloader from 'nodejs-file-downloader';
import { tall } from 'tall';
import type { 
    CheerioElement, 
    ImageMetadata, 
    TweetMetadataType
} from '../../infrastructure/types/index.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configure environment for safe operations
 */
export function configureEnvironment(): void {
    // We need to set this to avoid SSL errors when downloading images
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
    process(tweet: TweetForEnrichment, url: string, page?: any): Promise<void>;
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
        tweet.metadata.description = $('meta[name=description]').attr('content');
        tweet.metadata.title = $('meta[name=title]').attr('content');
    }
}

/**
 * GoodReads media processor
 */
export class GoodReadsProcessor implements MediaProcessor {
    canProcess(url: string): boolean {
        return url.includes("goodreads.com") && !url.includes("user_challenges");
    }

    async process(tweet: TweetForEnrichment, url: string, page: any): Promise<void> {
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
        tweet.metadata.title = title;
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
        tweet.metadata.description = Array.from($("div[id=mw-content-text] p"))
            .slice(0, 2)
            .map((el: CheerioElement) => $(el).text())
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
        tweet.metadata.description = $('meta[name=description]').attr('content');
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

    async processKnownDomain(tweet: TweetForEnrichment, url: string, page?: any): Promise<void> {
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
 * Downloads media with standardized configuration
 */
export async function downloadMedia(
    imageUrl: string, 
    config: DownloadConfig = { directory: "./metadata" }
): Promise<string> {
    const downloader = new Downloader({
        url: imageUrl,
        directory: config.directory,
    });
    
    const { filePath } = await downloader.download();
    return filePath;
}

/**
 * Resolves and expands shortened URLs
 */
export async function expandUrl(shortUrl?: string): Promise<string | undefined> {
    if (!shortUrl) return undefined;
    return await tall(shortUrl);
}

// ============================================================================
// ENRICHMENT STRATEGIES
// ============================================================================

export class TweetEnricher {
    private mediaRegistry: MediaProcessorRegistry;
    private logger: any;

    constructor(logger: any) {
        this.mediaRegistry = new MediaProcessorRegistry();
        this.logger = logger;
    }

    /**
     * Downloads and processes tweet media
     */
    async downloadTweetMedia(
        tweet: TweetForEnrichment, 
        page?: any,
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
        page?: any,
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
        page?: any,
        onSave?: (tweet: TweetForEnrichment) => void
    ): Promise<void> {
        const [filePath, url] = await Promise.all([
            downloadMedia(tweet.metadata.img!),
            expandUrl(tweet.metadata.url)
        ]);
        
        tweet.metadata.img = filePath;
        if (url) {
            tweet.metadata.url = url;
            tweet.tweet = undefined;
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
export function shouldEnrichTweet(tweet: any, enrichments: any[]): boolean {
    if (!tweet.metadata) return false;
    
    const { embed } = tweet.metadata;
    const alreadyEnriched = enrichments.find((_tweet: any) => 
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