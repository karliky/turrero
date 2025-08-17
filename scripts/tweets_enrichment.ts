import {
  createBrowser,
  createScriptLogger,
  getScriptDirectory,
  runWithErrorHandling as _runWithErrorHandling,
} from "./libs/common-utils.ts";
import { createDataAccess } from "./libs/data-access.ts";
import {
  configureEnvironment,
  isValidMetadataType,
  shouldEnrichTweet,
  TweetEnricher,
  type TweetForEnrichment,
  downloadMediaParallel as _downloadMediaParallel,
} from "./libs/enrichment-utils.ts";
import type {
  ContextualError,
  EnrichedTweetData,
  Tweet,
  TweetEmbedMetadata,
  TweetImageMetadata,
} from "../infrastructure/types/index.ts";
import { TweetMetadataType } from "../infrastructure/types/index.ts";
import type { Page } from "puppeteer";

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger("tweets-enrichment");
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
      dataAccess.getTweetsEnriched(),
    ]);

    for (const tweetLibrary of tweets) {
      await processTweetLibrary(
        tweetLibrary as Tweet[],
        enrichments,
        enricher,
        page,
      );
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
  page: Page,
): Promise<void> {
  for (const tweet of tweets) {
    // Convert Tweet to TweetForEnrichment for shouldEnrichTweet check
    const enrichmentTweet: TweetForEnrichment = {
      id: tweet.id,
      metadata: {
        ...tweet.metadata,
      } as unknown as TweetForEnrichment["metadata"],
    };

    if (!shouldEnrichTweet(enrichmentTweet, enrichments)) continue;

    await processTweetForEnrichment(tweet, enricher, page);
  }
}

async function processTweetForEnrichment(
  tweet: Tweet,
  enricher: TweetEnricher,
  page: Page,
): Promise<void> {
  const { embed } = tweet.metadata || {};

  // Only process as embedded tweet if embed has actual data (id, author, tweet)
  if (embed && embed.id && embed.author && embed.tweet) {
    await processEmbeddedTweet(tweet, embed);
    return;
  }

  if (!isValidMetadataType(tweet.metadata?.type)) return;

  // Convert Tweet to TweetForEnrichment
  const enrichmentTweet: TweetForEnrichment = {
    id: tweet.id,
    metadata: {
      ...tweet.metadata,
    } as unknown as TweetForEnrichment["metadata"],
  };

  try {
    if (tweet.metadata?.type === TweetMetadataType.CARD) {
      await enricher.downloadTweetMedia(enrichmentTweet, page, saveTweet);
    }
    // Note: Image processing is now handled by download-thread-media.ts
    // Only cards are processed here to avoid duplication
  } catch (error: unknown) {
    handleEnrichmentError(error, tweet);
  }
}

async function processEmbeddedTweet(
  tweet: Tweet,
  embed: TweetEmbedMetadata,
): Promise<void> {
  logger.debug(
    `Processing embedded tweet: ${embed.id} for tweet ${tweet.id}`,
  );

  const existingEnrichments = await dataAccess.getTweetsEnriched();
  existingEnrichments.push({
    id: tweet.id,
    type: "embeddedTweet",
    media: "embedded",
    title: embed.author,
    description: embed.tweet,
    url: `https://x.com/${embed.author}/status/${embed.id}`,
  });

  await dataAccess.saveTweetsEnriched(existingEnrichments);
}

// processImageTweets function removed - image processing is now handled by download-thread-media.ts
// This ensures no duplication and proper path management

function handleEnrichmentError(error: unknown, tweet: Tweet): void {
  const contextError = error as ContextualError;
  logger.error(
    "Request failed",
    tweet.id,
    tweet.metadata,
    contextError.message || "Unknown error",
  );

  if (tweet.metadata) {
    delete tweet.metadata.url;
  }
}

async function saveTweet(tweet: TweetForEnrichment): Promise<void> {
  logger.debug(`Saving enriched tweet: ${tweet.id}`);

  // Clean up embed data before saving
  delete tweet.metadata.embed;

  const existingEnrichments = await dataAccess.getTweetsEnriched();

  // Ensure required fields are present
  const enrichedData = {
    id: tweet.id,
    type: tweet.metadata.type || "unknown",
    media: tweet.metadata.media || "unknown",
    title: tweet.metadata.title || "",
    description: tweet.metadata.description || "",
    url: tweet.metadata.url || "",
    img: tweet.metadata.img || "",
  } as EnrichedTweetData;

  existingEnrichments.push(enrichedData);
  await dataAccess.saveTweetsEnriched(existingEnrichments);
}

// Run with standardized error handling
try {
  await enrichTweets();
  logger.info("Enrichment process completed successfully");
} catch (error) {
  logger.error("Enrichment process failed:", error);
  // Don't re-throw the error to prevent file corruption on Puppeteer cleanup
}
