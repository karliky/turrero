// NODE_TLS_REJECT_UNAUTHORIZED=0
import Downloader from 'nodejs-file-downloader';
import { writeFileSync } from 'fs';
import { tall } from 'tall';
import enrichments from '../infrastructure/db/tweets_enriched.json' with { type: 'json' };
import existingTweets from '../infrastructure/db/tweets_enriched.json' with { type: 'json' };
import tweetsLibrary from '../infrastructure/db/tweets.json' with { type: 'json' };
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import puppeteer, { Page } from 'puppeteer';
import { createLogger } from '../infrastructure/logger.js';

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Tweet, EnrichmentResult, TweetMetadataType, CheerioElement, ImageMetadata, ContextualError, JsonContent } from '../infrastructure/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
const logger = createLogger({ prefix: 'tweets-enrichment' });

// We need to set this to avoid SSL errors when downloading images
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface TweetForEnrichment {
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

(async (): Promise<void> => {
    const browser = await puppeteer.launch({ slowMo: 200 });
    const page: Page = await browser.newPage();

    const processKnownDomain = async (tweet: TweetForEnrichment, url: string): Promise<void> => {
        if (url.includes("youtube.com")) {
            const response = await fetch(url);
            const data = await response.text();
            const $ = cheerio.load(data);
            tweet.metadata.media = "youtube";
            tweet.metadata.description = $('meta[name=description]').attr('content');
            tweet.metadata.title = $('meta[name=title]').attr('content');
        }
        if (url.includes("goodreads.com") && !url.includes("user_challenges")) {
            await Promise.all([page.goto(url), page.waitForNavigation(), page.waitForSelector('h1')]);
            const title = await page.evaluate(() => document.querySelector('h1')?.textContent);
            tweet.metadata.media = "goodreads";
            tweet.metadata.title = title;
        }
        if (url.includes("wikipedia.org")) {
            const response = await fetch(url);
            const data = await response.text();
            const $ = cheerio.load(data);
            tweet.metadata.media = "wikipedia";
            tweet.metadata.title = $('h1').text().trim();
            tweet.metadata.description = Array.from($("div[id=mw-content-text] p")).slice(0, 2).map((el: CheerioElement) => $(el).text()).join("").trim()
            // Prevent ban from Wikipedia servers
            await new Promise(r => setTimeout(r, 1000));
        }
        if (url.includes("linkedin.com")) {
            const response = await fetch(url);
            const data = await response.text();
            const $ = cheerio.load(data);
            tweet.metadata.media = "linkedin";
            tweet.metadata.title = $('h1').text().trim();
            tweet.metadata.description = $('meta[name=description]').attr('content');
        }
    }

    const downloadTweetMedia = async (tweet: TweetForEnrichment): Promise<void> => {
        if (!tweet.metadata.img) {
            const url = await tall(tweet.metadata.url);
            tweet.metadata.url = url;
            await processKnownDomain(tweet, url);
            saveTweet(tweet);
            return;
        }
        const downloader = new Downloader({
            url: tweet.metadata.img,
            directory: "./metadata",
        });
        const { filePath } = await downloader.download();
        if (!tweet.metadata.url) {
            delete tweet.metadata.embed;
            tweet.metadata.img = filePath;
            tweet.metadata.type = TweetMetadataType.IMAGE;
            saveTweet(tweet);
            return;
        }
        const url = await tall(tweet.metadata.url);
        tweet.metadata.img = filePath;
        tweet.metadata.url = url;
        tweet.tweet = undefined;
        await processKnownDomain(tweet, url);
        saveTweet(tweet);
    };

    for (const tweetLibrary of tweetsLibrary) {
        for (const tweet of tweetLibrary as Tweet[]) {
            if (!tweet.metadata) continue;
            const { embed } = tweet.metadata;
            if (enrichments.find((_tweet: EnrichmentResult) => tweet.id === _tweet.id || (embed && embed.id === _tweet.id))) {
                continue;
            }
            if (embed) {
                logger.debug({ type: "embeddedTweet", embeddedTweetId: embed.id, ...embed, id: tweet.id, });

                (existingTweets as JsonContent[]).push({ type: "embeddedTweet", embeddedTweetId: embed.id, ...embed, id: tweet.id, });
                writeFileSync(__dirname + '/../infrastructure/db/tweets_enriched.json', JSON.stringify(existingTweets, null, 4));
            }
            if (!tweet.metadata.type) continue;
            try {
                if (tweet.metadata.type === TweetMetadataType.CARD) {
                    await downloadTweetMedia(tweet);
                    continue;
                }
                await Promise.all(tweet.metadata.imgs!.map(async (metadata: ImageMetadata) => {
                    (metadata as { type: string }).type = TweetMetadataType.IMAGE;
                    await downloadTweetMedia({ id: tweet.id, metadata });
                }));
            } catch (error: unknown) {
                const contextError = error as ContextualError;
                logger.error("Request failed", tweet.id, tweet.metadata, contextError.message || 'Unknown error');
                tweet.metadata.url = undefined;
            }
        }
    }
    logger.info("Finished!");
    process.exit(0);
})()

function saveTweet(tweet: TweetForEnrichment): void {
    logger.debug({ id: tweet.id, ...tweet.metadata });
    delete tweet.metadata.embed;
    (existingTweets as JsonContent[]).push({ id: tweet.id, ...tweet.metadata });
    writeFileSync(__dirname + '/../infrastructure/db/tweets_enriched.json', JSON.stringify(existingTweets, null, 4));
}