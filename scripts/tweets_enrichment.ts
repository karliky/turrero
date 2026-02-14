import {
  createBrowser,
  createScriptLogger,
  getScriptDirectory,
  runWithErrorHandling,
} from "./libs/common-utils.ts";
import { createDataAccess } from "./libs/data-access.ts";
import {
  configureEnvironment,
  deriveGifUrl,
  expandUrl,
  GenericCardProcessor,
  isBlobUrl,
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

    for (const [libraryIndex, tweetLibrary] of tweets.entries()) {
      logger.info(`Processing thread ${libraryIndex + 1}/${tweets.length} (${tweetLibrary.length} tweets)`);
      await processTweetLibrary(
        tweetLibrary as Tweet[],
        enrichments,
        enricher,
        page,
        allTweetsFlat,
        libraryIndex + 1,
        tweets.length,
      );
    }

    // Retroactive GIF patching: add video URLs to existing enrichment entries
    // that have tweet_video_thumb poster images but no video field
    await patchExistingGifEntries(allTweetsFlat);

    // Retroactive card URL patching: resolve empty card URLs from tweet text t.co links
    await patchExistingCardUrls(allTweetsFlat);

    // Retroactive embed ID/URL patching: resolve unknown embed IDs from tweet text,
    // and reconstruct URLs for embeds with known IDs but missing URLs
    await patchExistingEmbedIds(allTweetsFlat);

    // Retroactive description patching: fetch og:description for card entries
    // that have a URL but no description
    await patchExistingDescriptions();

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
  libraryIndex: number,
  totalLibraries: number,
): Promise<void> {
  for (const [tweetIndex, tweet] of tweets.entries()) {
    if (tweetIndex > 0 && tweetIndex % 25 === 0) {
      logger.info(
        `Progress thread ${libraryIndex}/${totalLibraries}: ${tweetIndex}/${tweets.length}`,
      );
    }

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

  // When tweet has both images and embed, process both so image and embed card both show (skip image if already present)
  if (tweet.metadata?.imgs?.length && embed) {
    const existing = await dataAccess.getTweetsEnriched();
    const hasImage = existing.some(
      (e) => e.id === tweet.id && (e.type === "image" || e.type === "media"),
    );
    if (!hasImage) await processImageTweets(tweet, enricher);
    await processEmbeddedTweet(tweet, embed, allTweetsFlat);
    return;
  }

  if (embed) {
    await processEmbeddedTweet(tweet, embed, allTweetsFlat);
    return;
  }

  if (!isValidMetadataType(tweet.metadata?.type)) return;

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
  if (candidates.length === 1) return candidates[0]!.id;

  // Multiple matches: prefer same author (Recuenco, etc.)
  const withAuthor = candidates.filter((t) => {
    const a = (t.author ?? "").toLowerCase();
    return a.includes("recuenco") || a.includes(authorHandle);
  });
  return (withAuthor.length >= 1 ? withAuthor[0]! : candidates[0]!).id;
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
  const alreadyHasEmbed = existingEnrichments.some(
    (e) => e.id === tweet.id && e.type === "embed",
  );
  if (!alreadyHasEmbed) {
    const embedEntry: EnrichedTweetData = {
      id: tweet.id,
      type: "embed",
      embeddedTweetId,
      author: authorDisplay,
      tweet: embed.tweet,
    };
    if (embed.url) embedEntry.url = embed.url;
    if (embed.img) embedEntry.img = embed.img;
    if (embed.video) embedEntry.video = embed.video;
    existingEnrichments.push(embedEntry);
    await dataAccess.saveTweetsEnriched(existingEnrichments);
  }
}

async function processImageTweets(
  tweet: Tweet,
  enricher: TweetEnricher,
): Promise<void> {
  const imagePromises = tweet.metadata!.imgs!.map(
    async (metadata: ImageMetadata) => {
      const imageMetadata: Record<string, unknown> = {
        ...metadata,
        type: "image" as TweetMetadataType,
      };
      // Pass through video field for GIFs
      if (metadata.video) {
        imageMetadata.video = metadata.video;
      }
      await enricher.downloadTweetMedia(
        { id: tweet.id, metadata: imageMetadata as TweetForEnrichment["metadata"] },
        undefined,
        saveTweet,
      );
    },
  );

  await Promise.all(imagePromises);
}

/**
 * Retroactively patches existing enrichment entries with video URLs.
 * For image/media entries: matches by position with raw tweet imgs to get video URLs,
 * or derives MP4 URL from tweet_video_thumb poster pattern.
 */
async function patchExistingGifEntries(allTweetsFlat: Tweet[]): Promise<void> {
  const enrichments = await dataAccess.getTweetsEnriched();
  const tweetMap = new Map<string, Tweet>();
  for (const t of allTweetsFlat) {
    tweetMap.set(t.id, t);
  }

  let patchCount = 0;

  // Group enrichment entries by tweet ID to track position among image/media entries
  const positionCounters = new Map<string, number>();

  for (const entry of enrichments) {
    if (entry.video) continue; // Already has video
    if (entry.type !== "image" && entry.type !== "media" && entry.type !== "embed") continue;

    if (entry.type === "embed") {
      // For embeds, check if img contains tweet_video_thumb pattern
      if (entry.img) {
        const derived = deriveGifUrl(entry.img);
        if (derived) {
          entry.video = derived;
          patchCount++;
        }
      }
      continue;
    }

    // For image/media entries, match by position with raw tweet imgs
    const tweet = tweetMap.get(entry.id);
    const rawImgs = tweet?.metadata?.imgs || [];
    const pos = positionCounters.get(entry.id) || 0;
    positionCounters.set(entry.id, pos + 1);

    const rawImg = rawImgs[pos];
    if (rawImg) {
      // Try explicit video field first, then derive from poster URL
      // Safety net: skip blob: URLs that may have leaked from DOM scraping
      const rawVideo = isBlobUrl(rawImg.video) ? undefined : rawImg.video;
      const videoUrl = rawVideo || deriveGifUrl(rawImg.img);
      if (videoUrl) {
        entry.video = videoUrl;
        patchCount++;
      }
    }
  }

  if (patchCount > 0) {
    await dataAccess.saveTweetsEnriched(enrichments);
    logger.info(`Retroactive GIF patch: added video URLs to ${patchCount} enrichment entries`);
  }
}

/**
 * Retroactively patches card entries that have a domain but empty URL.
 * Finds t.co links in the raw tweet text, expands them, and checks if
 * the expanded URL matches the card domain (e.g. youtube.com/youtu.be).
 */
async function patchExistingCardUrls(allTweetsFlat: Tweet[]): Promise<void> {
  const enrichments = await dataAccess.getTweetsEnriched();
  const tweetMap = new Map<string, Tweet>();
  for (const t of allTweetsFlat) {
    tweetMap.set(t.id, t);
  }

  const candidates = enrichments.filter(
    (e) => e.type === "card" && (!e.url || e.url === "") && e.domain,
  );

  if (candidates.length === 0) return;

  logger.info(`Card URL patch: ${candidates.length} cards with empty URL, resolving...`);
  let patchCount = 0;

  for (const entry of candidates) {
    const tweet = tweetMap.get(entry.id);
    if (!tweet?.tweet) continue;

    // Extract t.co links from tweet text
    const tcoLinks = tweet.tweet.match(/https?:\/\/t\.co\/\w+/g);
    if (!tcoLinks) continue;

    for (const tcoLink of tcoLinks) {
      const expanded = await expandUrl(tcoLink);
      if (!expanded) continue;

      // Check if expanded URL matches the card domain
      const domain = entry.domain!.toLowerCase();
      const expandedLower = expanded.toLowerCase();
      if (
        (domain.includes('youtube') && (expandedLower.includes('youtube.com') || expandedLower.includes('youtu.be'))) ||
        (domain.includes('goodreads') && expandedLower.includes('goodreads.com')) ||
        (domain.includes('wikipedia') && expandedLower.includes('wikipedia.org')) ||
        (domain.includes('linkedin') && expandedLower.includes('linkedin.com')) ||
        expandedLower.includes(domain)
      ) {
        entry.url = expanded;
        patchCount++;
        break;
      }
    }
  }

  if (patchCount > 0) {
    await dataAccess.saveTweetsEnriched(enrichments);
    logger.info(`Card URL patch: resolved ${patchCount} empty card URLs`);
  } else {
    logger.info("Card URL patch: no URLs resolved");
  }
}

/**
 * Extracts the @handle from an embed author string.
 * Author format is "Display Name\n@handle" or just "@handle".
 */
function getHandleFromEmbedAuthor(author: string): string | null {
  const match = author.match(/@(\w+)/);
  return match ? match[1]! : null;
}

/**
 * Retroactively patches embed entries:
 * 1. Resolves "unknown" embed IDs by extracting status IDs from tweet text URLs
 * 2. Reconstructs missing URLs for embeds that have a known ID but no URL
 */
async function patchExistingEmbedIds(allTweetsFlat: Tweet[]): Promise<void> {
  const enrichments = await dataAccess.getTweetsEnriched();
  const tweetMap = new Map<string, Tweet>();
  for (const t of allTweetsFlat) {
    tweetMap.set(t.id, t);
  }

  const embedEntries = enrichments.filter((e) => e.type === "embed");
  if (embedEntries.length === 0) return;

  let idPatchCount = 0;
  let urlPatchCount = 0;

  for (const entry of embedEntries) {
    // Case 1: Unknown embed ID — try to extract from tweet text URLs
    if (entry.embeddedTweetId === "unknown" || !entry.embeddedTweetId) {
      const tweet = tweetMap.get(entry.id);
      if (tweet?.tweet) {
        // Look for x.com/*/status/* or twitter.com/*/status/* URLs in tweet text
        const statusMatch = tweet.tweet.match(
          /(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/
        );
        if (statusMatch) {
          const handle = statusMatch[1]!;
          const statusId = statusMatch[2]!;
          entry.embeddedTweetId = statusId;
          if (!entry.url) {
            entry.url = `https://x.com/${handle}/status/${statusId}`;
            urlPatchCount++;
          }
          idPatchCount++;
        }
      }
    }

    // Case 2: Known embed ID but no URL — reconstruct from handle + ID
    if (entry.embeddedTweetId && entry.embeddedTweetId !== "unknown" && !entry.url) {
      const handle = getHandleFromEmbedAuthor(entry.author || "");
      if (handle) {
        entry.url = `https://x.com/${handle}/status/${entry.embeddedTweetId}`;
        urlPatchCount++;
      }
    }
  }

  if (idPatchCount > 0 || urlPatchCount > 0) {
    await dataAccess.saveTweetsEnriched(enrichments);
    logger.info(
      `Embed patch: resolved ${idPatchCount} unknown IDs, reconstructed ${urlPatchCount} missing URLs`
    );
  }
}

async function patchExistingDescriptions(): Promise<void> {
  const enrichments = await dataAccess.getTweetsEnriched();
  const processor = new GenericCardProcessor();

  const candidates = enrichments.filter(
    (e) => e.type === "card" && e.url && (!e.description || e.description === ""),
  );

  if (candidates.length === 0) return;

  const total = candidates.length;
  logger.info(`Description patch: ${total} cards without description, fetching...`);
  let patchCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const entry = candidates[i]!;
    const url = entry.url!; // Filtered above: e.url is truthy

    if ((i + 1) % 20 === 0 || i === 0) {
      logger.info(`Description patch: ${i + 1}/${total} (found ${patchCount} so far)`);
    }

    const fakeTweet: TweetForEnrichment = {
      id: entry.id,
      metadata: { description: entry.description || "", url },
    };

    await processor.process(fakeTweet, url);

    if (fakeTweet.metadata.description) {
      entry.description = fakeTweet.metadata.description;
      patchCount++;
    }
  }

  if (patchCount > 0) {
    await dataAccess.saveTweetsEnriched(enrichments);
    logger.info(`Description patch: added descriptions to ${patchCount} card entries`);
  } else {
    logger.info("Description patch: no new descriptions found");
  }
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
    ...(tweet.metadata.video ? { video: tweet.metadata.video } : {}),
  } as EnrichedTweetData;

  const isDuplicate = existingEnrichments.some(
    (e) => e.id === enrichedData.id && e.type === enrichedData.type,
  );
  if (isDuplicate) {
    logger.debug(`Skipping duplicate enrichment: ${enrichedData.id} (${enrichedData.type})`);
    return;
  }

  existingEnrichments.push(enrichedData);
  await dataAccess.saveTweetsEnriched(existingEnrichments);
}

// Run with standardized error handling
runWithErrorHandling(
  enrichTweets,
  logger,
  "Enriching tweets with metadata",
);
