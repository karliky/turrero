import {
  createBrowser,
  createScriptLogger,
  getScriptDirectory,
  runWithErrorHandling,
} from "./libs/common-utils.ts";
import { createDataAccess } from "./libs/data-access.ts";
import {
  configureEnvironment,
  isValidMetadataType,
  shouldEnrichTweet,
  TweetEnricher,
  type TweetForEnrichment,
} from "./libs/enrichment-utils.ts";
import type {
  ContextualError,
  EnrichedTweetData,
  ImageMetadata,
  Tweet,
  TweetEmbedMetadata,
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

    const allTweetsFlat = (tweets as Tweet[][]).flat();

    for (const tweetLibrary of tweets) {
      await processTweetLibrary(
        tweetLibrary as Tweet[],
        enrichments,
        enricher,
        page,
        allTweetsFlat,
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
  allTweetsFlat: Tweet[],
): Promise<void> {
  for (const tweet of tweets) {
    // Convert Tweet to TweetForEnrichment for shouldEnrichTweet check
    const enrichmentTweet: TweetForEnrichment = {
      id: tweet.id,
      metadata: {
        ...tweet.metadata,
      } as TweetForEnrichment["metadata"],
    };

    if (!shouldEnrichTweet(enrichmentTweet, enrichments)) continue;

    await processTweetForEnrichment(tweet, enricher, page, allTweetsFlat);
  }
}

async function processTweetForEnrichment(
  tweet: Tweet,
  enricher: TweetEnricher,
  page: Page,
  allTweetsFlat: Tweet[],
): Promise<void> {
  const { embed } = tweet.metadata || {};

  if (embed) {
    await processEmbeddedTweet(tweet, embed, allTweetsFlat);
    return;
  }

  if (!isValidMetadataType(tweet.metadata?.type)) return;

  // Convert Tweet to TweetForEnrichment
  const enrichmentTweet: TweetForEnrichment = {
    id: tweet.id,
    metadata: {
      ...tweet.metadata,
    } as TweetForEnrichment["metadata"],
  };

  try {
    if (tweet.metadata?.type === TweetMetadataType.CARD) {
      await enricher.downloadTweetMedia(enrichmentTweet, page, saveTweet);
    } else if (tweet.metadata?.imgs) {
      await processImageTweets(tweet, enricher);
    }
  } catch (error: unknown) {
    handleEnrichmentError(error, tweet);
  }
}

/** Minimum length for search key to avoid false positives when resolving unknown embed IDs */
const MIN_SEARCH_KEY_LENGTH = 20;

/** Removes trailing truncation (e.g. ... or …) so comparison is robust */
function normalizeTruncation(text: string): string {
  return text
    .trim()
    .replace(/\s*[.…]{2,}\s*$/g, "")
    .replace(/\s+$/, "");
}

/** Normalizes quotes and spaces so embed text matches DB (e.g. "professionalize them" vs "professionalize them") */
function normalizeForMatch(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036"]/g, '"') // curly/smart quotes → straight
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Resolves embed ID when scraping returned "unknown" by searching in tweets.json.
 * Searches in ALL tweets from ALL threads (allTweetsFlat), not only first tweet per thread.
 * Uses embed text minus 5 chars; normalizes truncation (.../…) and quotes so "…" matches "…".
 * Match when: tweet in DB contains searchKey (embed truncated) OR tweet in DB is prefix of embed (embed has extra e.g. URL).
 */
function resolveEmbedIdFromTweets(
  embed: TweetEmbedMetadata,
  allTweetsFlat: Tweet[],
): string | null {
  const raw = normalizeTruncation(embed.tweet ?? "");
  if (!raw) return null;

  const searchKeyRaw =
    raw.length > 5 ? raw.slice(0, raw.length - 5) : raw;
  const searchKey = normalizeForMatch(searchKeyRaw);
  if (searchKey.length < MIN_SEARCH_KEY_LENGTH) return null;

  const authorHandle = embed.author?.replace(/^@/, "").toLowerCase() || "";

  const candidates = allTweetsFlat.filter((t) => {
    if (!t.tweet || typeof t.tweet !== "string") return false;
    const ct = normalizeForMatch(normalizeTruncation(t.tweet));
    if (ct.length < MIN_SEARCH_KEY_LENGTH) return false;
    return (
      ct.includes(searchKey) ||
      searchKey.startsWith(ct)
    );
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;

  // Multiple matches: prefer same author (Recuenco, etc.)
  const withAuthor = candidates.filter((t) => {
    const a = (t.author ?? "").toLowerCase();
    return a.includes("recuenco") || a.includes(authorHandle);
  });
  return (withAuthor.length >= 1 ? withAuthor[0] : candidates[0]).id;
}

async function processEmbeddedTweet(
  tweet: Tweet,
  embed: TweetEmbedMetadata,
  allTweetsFlat: Tweet[],
): Promise<void> {
  logger.debug(
    `Processing embedded tweet: ${embed.id} for tweet ${tweet.id}`,
  );

  // Require at least author and tweet text to show the embed card (ID can be "unknown")
  if (!embed.author?.trim() || !embed.tweet?.trim()) {
    logger.warn(
      `Skipping embedded tweet without author/text for tweet ${tweet.id}`,
    );
    return;
  }

  // Use embed ID when valid; otherwise try to resolve from tweets.json, fallback "unknown"
  let embeddedTweetId: string =
    embed.id?.trim() && embed.id !== "unknown" ? embed.id : "unknown";
  if (embeddedTweetId === "unknown") {
    const resolved = resolveEmbedIdFromTweets(embed, allTweetsFlat);
    if (resolved) {
      embeddedTweetId = resolved;
      logger.debug(`Resolved unknown embed ID for tweet ${tweet.id} -> ${resolved}`);
    }
  }

  // Frontend expects author with @handle (e.g. "Name\n@handle" or "@handle") for getEmbeddedAuthorHandle
  const authorDisplay = embed.author.includes("@")
    ? embed.author
    : `@${embed.author}`;

  const existingEnrichments = await dataAccess.getTweetsEnriched();
  const withoutThisTweet = existingEnrichments.filter((e) => e.id !== tweet.id);
  withoutThisTweet.push({
    id: tweet.id,
    type: "embed",
    embeddedTweetId,
    author: authorDisplay,
    tweet: embed.tweet,
  });

  await dataAccess.saveTweetsEnriched(withoutThisTweet);
}

async function processImageTweets(
  tweet: Tweet,
  enricher: TweetEnricher,
): Promise<void> {
  const imagePromises = tweet.metadata!.imgs!.map(
    async (metadata: ImageMetadata) => {
      const imageMetadata = {
        ...metadata,
        type: "image" as TweetMetadataType,
      };
      await enricher.downloadTweetMedia(
        { id: tweet.id, metadata: imageMetadata },
        undefined,
        saveTweet,
      );
    },
  );

  await Promise.all(imagePromises);
}

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
    media: tweet.metadata.media || "", // Empty string instead of "unknown"
    domain: tweet.metadata.domain || "",
    title: tweet.metadata.title || "",
    description: tweet.metadata.description || "",
    url: tweet.metadata.url || "",
    img: tweet.metadata.img || "",
  } as EnrichedTweetData;

  existingEnrichments.push(enrichedData);
  await dataAccess.saveTweetsEnriched(existingEnrichments);
}

// Run with standardized error handling
runWithErrorHandling(
  enrichTweets,
  logger,
  "Enriching tweets with metadata",
);
