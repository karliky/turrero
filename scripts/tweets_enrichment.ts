import { 
    getScriptDirectory, 
    createScriptLogger, 
    createBrowser, 
    runWithErrorHandling 
} from './libs/common-utils.js';
import { createDataAccess } from './libs/data-access.js';
import {
    configureEnvironment,
    TweetEnricher,
    shouldEnrichTweet,
    isValidMetadataType,
    type TweetForEnrichment
} from './libs/enrichment-utils.js';
import type { 
    Tweet, 
    EnrichedTweetData, 
    TweetMetadataType, 
    ImageMetadata, 
    ContextualError,
    TweetEmbedMetadata
} from '../infrastructure/types/index.js';
import type { Page } from 'puppeteer';

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger('tweets-enrichment');
const dataAccess = createDataAccess(scriptDir);

// Configure environment for safe operations
configureEnvironment();

async function enrichTweets(): Promise<void> {
    const browser = await createBrowser({ slowMo: 200 });
    const page = await browser.newPage();
    const enricher = new TweetEnricher(logger);

    try {
        const [tweets, enrichments] = await Promise.all([
            dataAccess.getTweets(),
            dataAccess.getTweetsEnriched()
        ]);

        for (const tweetLibrary of tweets) {
            await processTweetLibrary(tweetLibrary as Tweet[], enrichments, enricher, page);
        }
        
        logger.info("Tweet enrichment completed successfully!");
    } finally {
        await browser.close();
    }
}

async function processTweetLibrary(
    tweets: Tweet[], 
    enrichments: EnrichedTweetData[], 
    enricher: TweetEnricher, 
    page: Page
): Promise<void> {
    for (const tweet of tweets) {
        if (!shouldEnrichTweet(tweet, enrichments)) continue;
        
        await processTweetForEnrichment(tweet, enricher, page);
    }
}

async function processTweetForEnrichment(
    tweet: Tweet, 
    enricher: TweetEnricher, 
    page: Page
): Promise<void> {
    const { embed } = tweet.metadata || {};
    
    if (embed) {
        await processEmbeddedTweet(tweet, embed);
        return;
    }

    if (!isValidMetadataType(tweet.metadata?.type)) return;

    try {
        if (tweet.metadata?.type === 'card') {
            await enricher.downloadTweetMedia(tweet, page, saveTweet);
        } else if (tweet.metadata?.imgs) {
            await processImageTweets(tweet, enricher);
        }
    } catch (error: unknown) {
        handleEnrichmentError(error, tweet);
    }
}

async function processEmbeddedTweet(tweet: Tweet, embed: TweetEmbedMetadata): Promise<void> {
    logger.debug({ 
        type: "embeddedTweet", 
        embeddedTweetId: embed.id, 
        ...embed, 
        id: tweet.id 
    });

    const existingEnrichments = await dataAccess.getTweetsEnriched();
    existingEnrichments.push({ 
        type: "embeddedTweet", 
        embeddedTweetId: embed.id, 
        ...embed, 
        id: tweet.id 
    });
    
    await dataAccess.saveTweetsEnriched(existingEnrichments);
}

async function processImageTweets(tweet: Tweet, enricher: TweetEnricher): Promise<void> {
    const imagePromises = tweet.metadata!.imgs!.map(async (metadata: ImageMetadata) => {
        const imageMetadata = { ...metadata, type: 'image' as TweetMetadataType };
        await enricher.downloadTweetMedia(
            { id: tweet.id, metadata: imageMetadata }, 
            undefined, 
            saveTweet
        );
    });
    
    await Promise.all(imagePromises);
}

function handleEnrichmentError(error: unknown, tweet: Tweet): void {
    const contextError = error as ContextualError;
    logger.error(
        "Request failed", 
        tweet.id, 
        tweet.metadata, 
        contextError.message || 'Unknown error'
    );
    
    if (tweet.metadata) {
        tweet.metadata.url = undefined;
    }
}

async function saveTweet(tweet: TweetForEnrichment): Promise<void> {
    logger.debug({ id: tweet.id, ...tweet.metadata });
    
    // Clean up embed data before saving
    delete tweet.metadata.embed;
    
    const existingEnrichments = await dataAccess.getTweetsEnriched();
    existingEnrichments.push({ id: tweet.id, ...tweet.metadata });
    await dataAccess.saveTweetsEnriched(existingEnrichments);
}

// Run with standardized error handling
runWithErrorHandling(
    enrichTweets,
    logger,
    "Enriching tweets with metadata"
);