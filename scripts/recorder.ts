/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import dotenv from "dotenv";
import { dirname, join } from "@std/path";
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
import { TweetMetadataType as _TweetMetadataType } from "../infrastructure/types/index.ts";

// Load environment variables (try .env.local first, then .env)
try {
  dotenv.config({ path: ".env.local" });
} catch {
  dotenv.config();
}

// Initialize logger
const logger = createDenoLogger("recorder");

// Progress bar utilities
class ProgressBar {
  private total: number;
  private current: number = 0;
  private width: number = 50;
  private lastUpdate: number = 0;
  private startTime: number;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  update(current: number, status?: string) {
    this.current = current;
    const now = Date.now();
    
    // Only update every 200ms to avoid flickering
    if (now - this.lastUpdate < 200 && current < this.total) return;
    this.lastUpdate = now;

    const percentage = Math.round((current / this.total) * 100);
    const filled = Math.round((current / this.total) * this.width);
    const empty = this.width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const elapsed = (now - this.startTime) / 1000;
    const rate = current / elapsed;
    const eta = current > 0 ? Math.round((this.total - current) / rate) : 0;
    
    const statusText = status ? ` | ${status}` : '';
    const progressText = `🔍 [${bar}] ${percentage}% (${current}/${this.total}) ETA: ${eta}s${statusText}`;
    
    // Clear line and write progress
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${' '.repeat(120)}\r${progressText}`));
    
    if (current >= this.total) {
      Deno.stdout.writeSync(new TextEncoder().encode('\n'));
    }
  }

  complete(summary?: string) {
    this.update(this.total);
    if (summary) {
      console.log(`✅ ${summary}`);
    }
  }

  fail(error: string) {
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${' '.repeat(120)}\r`));
    console.log(`❌ ${error}`);
  }
}

const __dirname = dirname(new URL(import.meta.url).pathname);

// Define device configuration for iPhone 15 Pro Max
const iPhone15ProMax = {
  name: "iPhone 15 Pro Max",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  viewport: {
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  },
};

interface TweetMetadata {
  type?: string;
  imgs?: Array<{ src: string; alt: string }>;
  embed?: {
    tweet?: string;
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
 * Parse CSV file into an array of objects.
 * @param filePath Path to the CSV file.
 * @returns Array of objects where each object represents a row in the CSV.
 */
async function _parseCSV(filePath: string): Promise<TweetCSV[]> {
  const csvContent = await Deno.readTextFile(filePath);
  const lines = csvContent.split("\n");
  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }
  const headers = lines[0]!.split(",");
  return lines.slice(1).map((line: string) => {
    const data = line.split(",");
    const obj = headers.reduce(
      (
        acc: { [key: string]: string },
        nextKey: string,
        index: number,
      ) => {
        acc[nextKey.trim()] = data[index]?.replace(/(^"|"$)/g, "").trim() ?? "";
        return acc;
      },
      { id: "" }, // Initialize with required 'id' property
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
  await page.waitForSelector('div[role="progressbar"]', { hidden: true });

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

  const metadata = await page.evaluate(() => {
    const article = document.querySelector('article[role="article"]');
    if (!article) {
      return {
        type: undefined,
        imgs: undefined,
        embed: { tweet: undefined },
      } as unknown as TweetMetadata;
    }

    // Extract media (images and videos/GIFs)
    const mediaItems: Array<{ src: string; alt: string; type?: string }> = [];

    // Extract static images (legacy method for compatibility)
    const imgs = Array.from(article.querySelectorAll('img[alt="Image"]'))
      .map((img: Element) => ({
        src: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt,
      }));

    // Add legacy images to media items
    imgs.forEach(img => {
      if (img.src.includes('pbs.twimg.com') && 
          !img.src.includes('/profile_images/') && 
          !img.src.includes('/profile_banners/') && 
          !img.src.includes('_profile') && 
          !img.src.includes('avatar')) {
        mediaItems.push({
          src: img.src,
          alt: img.alt,
          type: "image"
        });
      }
    });

    // Extract videos/GIFs
    const videoElements = article.querySelectorAll('video');
    Array.from(videoElements).forEach((video) => {
      const poster = (video as HTMLVideoElement).poster;
      if (poster && poster.includes('pbs.twimg.com')) {
        // Use poster image URL as the source for download
        mediaItems.push({
          src: poster,
          alt: "Video",
          type: "video"
        });
      }
    });

    // Also look for video thumbnails in img elements
    const videoThumbs = article.querySelectorAll(
      'img[src*="video_thumb"], img[src*="ext_tw_video_thumb"], img[src*="amplify_video_thumb"], img[src*="tweet_video_thumb"]'
    );
    Array.from(videoThumbs).forEach((thumb) => {
      const thumbSrc = (thumb as HTMLImageElement).src;
      mediaItems.push({
        src: thumbSrc,
        alt: "Video thumbnail",
        type: "video"
      });
    });

    // Determine type and format for compatibility
    const hasVideo = mediaItems.some(item => item.type === "video");
    const type = hasVideo ? "video" : (mediaItems.length > 0 ? "image" : undefined);
    const finalImgs = mediaItems.length > 0 ? mediaItems.map(item => ({ src: item.src, alt: item.alt })) : undefined;

    return {
      type: type,
      imgs: finalImgs,
    } as unknown as TweetMetadata;
  });

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

/**
 * Fetch all tweets in a thread using simplified strategy
 * X.com automatically loads the full thread context when navigating to any tweet
 */
async function fetchCompleteThread(
  page: Page,
  expectedAuthor: string,
  threadId: string,
): Promise<Tweet[]> {
  logger.debug(
    `Fetching complete thread for ${threadId} by author ${expectedAuthor}`,
  );

  // Navigate directly to the tweet - X.com will load the full thread context
  await page.goto(`https://x.com/${expectedAuthor}/status/${threadId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Wait for content to load
  await page.waitForSelector('article[data-testid="tweet"]', {
    timeout: 30000,
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  let allTweets: Tweet[] = [];
  let previousTweetCount = 0;
  let noNewTweetsCount = 0;
  const maxScrollAttempts = 10;

  console.log('🚀 Starting thread scraping process...');
  const progressBar = new ProgressBar(maxScrollAttempts);

  // Scroll and collect tweets until no new ones are found
  for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
    const statusText = `Collecting tweets (${allTweets.length} found)`;
    progressBar.update(attempt + 1, statusText);

    // Extract all tweets currently visible on the page
    const threadTweets = await page.evaluate((expectedUsername: string) => {
      const tweetElements = Array.from(
        document.querySelectorAll('article[data-testid="tweet"]'),
      );
      const tweets: Tweet[] = [];

      for (const element of tweetElements) {
        try {
          // Extract tweet ID from the time element's parent link
          const timeElement = element.querySelector("time");
          const timeParent = timeElement?.parentElement as HTMLAnchorElement;
          const href = timeParent?.href;

          if (!href) continue;

          const idMatch = href.match(/status\/(\d+)/);
          if (!idMatch) continue;

          const currentTweetId = idMatch[1];

          // Extract tweet text
          const textElement = element.querySelector(
            '[data-testid="tweetText"]',
          );
          const tweetText = textElement?.textContent || "";

          if (!tweetText.trim()) continue;

          // Check if this tweet is from the expected author
          const authorElement = element.querySelector(
            '[data-testid="User-Name"] a',
          );
          const authorHref = (authorElement as HTMLAnchorElement)?.href;

          if (
            !authorHref ||
            !authorHref.toLowerCase().includes(expectedUsername.toLowerCase())
          ) {
            continue; // Skip tweets from other users
          }

          // Extract timestamp
          const timeValue = timeElement?.getAttribute("datetime");

          // Extract stats
          const replyElement = element.querySelector('[data-testid="reply"]');
          const retweetElement = element.querySelector(
            '[data-testid="retweet"]',
          );
          const likeElement = element.querySelector('[data-testid="like"]');
          const bookmarkElement = element.querySelector(
            '[data-testid="bookmark"]',
          );

          const getStatValue = (el: Element | null): string => {
            const text = el?.getAttribute("aria-label") || "";
            const match = text.match(/(\d+(?:,\d+)*)/);
            return match?.[1] || "0";
          };

          // Extract media (images and videos/GIFs)
          const mediaItems: Array<{ src: string; alt: string; type?: string }> = [];

          // Extract static images
          const imgElements = element.querySelectorAll(
            'img[src*="pbs.twimg.com"]',
          );
          Array.from(imgElements).forEach((img) => {
            const imgSrc = (img as HTMLImageElement).src;
            // Skip profile images and other non-content images
            if (!imgSrc.includes('/profile_images/') && 
                !imgSrc.includes('/profile_banners/') && 
                !imgSrc.includes('_profile') && 
                !imgSrc.includes('avatar')) {
              mediaItems.push({
                src: imgSrc,
                alt: (img as HTMLImageElement).alt || "Image",
                type: "image"
              });
            }
          });

          // Extract videos/GIFs
          const videoElements = element.querySelectorAll('video');
          Array.from(videoElements).forEach((video) => {
            const poster = (video as HTMLVideoElement).poster;
            if (poster && poster.includes('pbs.twimg.com')) {
              // Use poster image URL as the source for download
              mediaItems.push({
                src: poster,
                alt: "Video",
                type: "video"
              });
            }
          });

          // Also look for video thumbnails in img elements
          const videoThumbs = element.querySelectorAll(
            'img[src*="video_thumb"], img[src*="ext_tw_video_thumb"], img[src*="amplify_video_thumb"], img[src*="tweet_video_thumb"]'
          );
          Array.from(videoThumbs).forEach((thumb) => {
            const thumbSrc = (thumb as HTMLImageElement).src;
            mediaItems.push({
              src: thumbSrc,
              alt: "Video thumbnail",
              type: "video"
            });
          });

          const metadata: TweetMetadata = {};
          if (mediaItems.length > 0) {
            // Determine primary type based on what media is found
            const hasVideo = mediaItems.some(item => item.type === "video");
            metadata.type = hasVideo ? "video" : "image";
            metadata.imgs = mediaItems.map(item => ({ src: item.src, alt: item.alt }));
          }

          // Create tweet object
          const tweet = {
            tweet: tweetText,
            author: authorHref,
            id: currentTweetId,
            metadata: metadata,
            time: timeValue || new Date().toISOString(),
            stats: {
              replies: getStatValue(replyElement),
              retweets: getStatValue(retweetElement),
              likes: getStatValue(likeElement),
              bookmarks: getStatValue(bookmarkElement),
              views: "0",
            },
          };

          tweets.push(tweet);
        } catch (error) {
          // Skip problematic tweets
          continue;
        }
      }

      return tweets;
    }, expectedAuthor);

    // Merge with existing tweets (remove duplicates)
    for (const tweet of threadTweets) {
      if (!allTweets.find((t) => t.id === tweet.id)) {
        allTweets.push(tweet);
      }
    }

    // Check if we found new tweets
    if (allTweets.length === previousTweetCount) {
      noNewTweetsCount++;
      if (noNewTweetsCount >= 3) {
        progressBar.complete(`Scraping completed: ${allTweets.length} tweets found`);
        break;
      }
    } else {
      noNewTweetsCount = 0;
      previousTweetCount = allTweets.length;
    }

    // Scroll down to load more content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for new content to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Look for and click "Show replies" button if present
    try {
      await page.evaluate(() => {
        const showRepliesButtons = Array.from(document.querySelectorAll("span"))
          .filter((span) =>
            span.textContent?.includes("Show replies") ||
            span.textContent?.includes("Show more replies")
          );

        for (const button of showRepliesButtons) {
          const clickableButton = button.closest("button") ||
            button.parentElement?.closest("button") ||
            button.parentElement?.parentElement?.closest("button");
          if (
            clickableButton &&
            (clickableButton as HTMLButtonElement).offsetParent !== null
          ) {
            (clickableButton as HTMLButtonElement).click();
            break;
          }
        }
      });

      // Wait a bit for content to load after clicking
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      // Ignore errors from clicking buttons
    }
  }

  // Ensure progress bar is completed if we exited the loop early
  if (noNewTweetsCount < 3) {
    progressBar.complete(`Scraping completed: ${allTweets.length} tweets found`);
  }

  // Sort chronologically
  allTweets.sort((a, b) =>
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  logger.info(
    `Found ${allTweets.length} tweets in thread ${threadId} by ${expectedAuthor}`,
  );

  return allTweets;
}

/**
 * Optimized username detection that's much faster than the previous approach
 * Uses the generic URL pattern and extracts username from page content
 */
async function detectUsernameForTweet(
  page: Page,
  tweetId: string,
): Promise<string> {
  const startTime = Date.now();

  try {
    logger.debug(`Starting optimized detection for tweet ID: ${tweetId}`);

    // Use the generic URL pattern directly - no need to try different usernames
    await page.goto(`https://x.com/i/status/${tweetId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Check if the page loaded successfully (don't wait for tweet content yet)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if we're on an error page or if the tweet doesn't exist
    const currentUrl = page.url();
    const pageContent = await page.content();
    if (
      pageContent.includes("This Tweet was deleted") ||
      pageContent.includes("Tweet not found") ||
      pageContent.includes("Page doesn't exist") ||
      currentUrl.includes("/login") ||
      currentUrl.includes("/signup") ||
      !currentUrl.includes("/status/")
    ) {
      logger.warn(
        `Tweet ${tweetId} appears to be deleted, doesn't exist, or requires authentication`,
      );
      return "Recuenco"; // Return default for non-existent tweets
    }

    // Extract username from page content using multiple strategies
    const detectedUsername = await page.evaluate(() => {
      // Strategy 1: Look for profile links in the tweet
      const profileLinks = Array.from(
        document.querySelectorAll('a[href*="x.com/"]'),
      )
        .map((link) => (link as HTMLAnchorElement).href)
        .filter((href) => {
          const match = href.match(/x\.com\/([^\/\?]+)(?:\/status\/\d+)?$/);
          const excluded = [
            "i",
            "search",
            "home",
            "notifications",
            "messages",
            "settings",
            "explore",
          ];
          return match && match[1] && !excluded.includes(match[1]) &&
            !match[1].includes("?");
        });

      if (profileLinks.length > 0) {
        const firstProfile = profileLinks[0];
        if (firstProfile) {
          const match = firstProfile.match(/x\.com\/([^\/\?]+)/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }

      // Strategy 2: Look for the tweet author's username in the tweet structure
      const authorElement = document.querySelector(
        '[data-testid="User-Name"] a[role="link"]',
      );
      if (authorElement) {
        const href = (authorElement as HTMLAnchorElement).href;
        const match = href.match(/x\.com\/([^\/\?]+)/);
        const excluded = [
          "i",
          "search",
          "home",
          "notifications",
          "messages",
          "settings",
          "explore",
        ];
        if (match && match[1] && !excluded.includes(match[1])) {
          return match[1];
        }
      }

      // Strategy 3: Look for canonical URL or meta tags
      const canonical = document.querySelector('link[rel="canonical"]')
        ?.getAttribute("href");
      if (canonical) {
        const match = canonical.match(/x\.com\/([^\/]+)\/status/);
        const excluded = [
          "i",
          "search",
          "home",
          "notifications",
          "messages",
          "settings",
          "explore",
        ];
        if (match && match[1] && !excluded.includes(match[1])) {
          return match[1];
        }
      }

      // Strategy 4: Search for username in tweet article structure
      const article = document.querySelector('article[data-testid="tweet"]');
      if (article) {
        const userLinks = article.querySelectorAll('a[href*="x.com/"]');
        for (const link of userLinks) {
          const href = (link as HTMLAnchorElement).href;
          const match = href.match(/x\.com\/([^\/\?]+)$/);
          const excluded = [
            "i",
            "search",
            "home",
            "notifications",
            "messages",
            "settings",
            "explore",
          ];
          if (match && match[1] && !excluded.includes(match[1])) {
            return match[1];
          }
        }
      }

      // Strategy 5: Look in the page structure for user data
      const userNameElements = document.querySelectorAll(
        '[data-testid="User-Name"]',
      );
      for (const element of userNameElements) {
        const link = element.querySelector('a[href*="x.com/"]');
        if (link) {
          const href = (link as HTMLAnchorElement).href;
          const match = href.match(/x\.com\/([^\/\?]+)$/);
          const excluded = [
            "i",
            "search",
            "home",
            "notifications",
            "messages",
            "settings",
            "explore",
          ];
          if (match && match[1] && !excluded.includes(match[1])) {
            return match[1];
          }
        }
      }

      return null;
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (detectedUsername) {
      logger.info(
        `Successfully detected username: ${detectedUsername} for tweet ID: ${tweetId} in ${duration}ms`,
      );
      return detectedUsername;
    } else {
      logger.warn(
        `Could not detect username for tweet ${tweetId} in ${duration}ms, trying fallback`,
      );

      // Fallback: Try to extract from any visible user information
      const fallbackUsername = await page.evaluate(() => {
        // Look for any @username mentions in the page that aren't system accounts
        const textContent = document.body.textContent || "";
        const atMentions = textContent.match(/@([a-zA-Z0-9_]+)/g);
        if (atMentions && atMentions.length > 0) {
          // Filter out system/generic accounts and return the first real username
          const systemAccounts = [
            "twitter",
            "x",
            "support",
            "privacy",
            "tos",
            "help",
          ];
          for (const mention of atMentions) {
            const username = mention.substring(1);
            if (
              !systemAccounts.includes(username.toLowerCase()) &&
              username.length > 2
            ) {
              return username;
            }
          }
        }
        return null;
      });

      if (fallbackUsername) {
        logger.info(
          `Detected username via fallback: ${fallbackUsername} for tweet ID: ${tweetId} in ${duration}ms`,
        );
        return fallbackUsername;
      }

      // Check if this tweet might not exist at all
      if (
        pageContent.includes("Something went wrong") ||
        pageContent.includes("Try again") ||
        pageContent.includes("Rate limit exceeded") ||
        pageContent.length < 1000
      ) { // Very short page content suggests error page
        logger.error(
          `Tweet ${tweetId} appears to be inaccessible or doesn't exist (page content: ${pageContent.length} chars)`,
        );
        throw new Error(`Tweet ${tweetId} not found or inaccessible`);
      }

      // Last resort: Use a common default
      logger.warn(
        `Could not detect username for tweet ${tweetId}, defaulting to Recuenco after ${duration}ms`,
      );
      return "Recuenco";
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // If it's our custom "tweet not found" error, re-throw it so main function can handle it
    if (
      error instanceof Error &&
      error.message.includes("not found or inaccessible")
    ) {
      throw error;
    }

    logger.error(
      `Error detecting username for tweet ${tweetId} after ${duration}ms:`,
      error,
    );

    // Last resort fallback for other errors
    return "Recuenco";
  }
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
  if (tweetIds.length === 0) {
    console.log('No new tweets to process.');
    return;
  }

  console.log(`🔍 Processing ${tweetIds.length} thread(s)...`);
  const threadProgressBar = new ProgressBar(tweetIds.length);

  for (let i = 0; i < tweetIds.length; i++) {
    const tweetId = tweetIds[i];
    const statusText = `Thread ${tweetId.substring(0, 8)}...`;
    threadProgressBar.update(i + 1, statusText);
    // Auto-detect username if not provided
    if (author === undefined) {
      author = await detectUsernameForTweet(page, tweetId);
      logger.info("Auto-detected author: ", author);
    }

    await page.goto(
      `https://x.com/${author}/status/${tweetId}`,
    );
    logger.debug("Waiting for selector");
    await page.waitForSelector('div[data-testid="tweetText"]', {
      timeout: 30000,
    });
    try {
      await rejectCookies(page);
      logger.debug("Cookies rejected, closed the popup");
    } catch {
      logger.debug("Could not reject cookies and close the popup");
    }

    // Use the new complete thread fetching method
    const threadTweets = await fetchCompleteThread(page, author, tweetId);

    if (threadTweets.length > 0) {
      // Read existing tweets
      const existingTweets = JSON.parse(
        await Deno.readTextFile(outputFilePath),
      );

      // Add the complete thread as an array
      existingTweets.push(threadTweets);

      // Save updated tweets
      await Deno.writeTextFile(
        outputFilePath,
        JSON.stringify(existingTweets, null, 4),
      );

      logger.info(
        `Successfully added thread ${tweetId} with ${threadTweets.length} tweets`,
      );
    } else {
      logger.warn(`No tweets found for thread ${tweetId}`);
    }

    author = undefined; // Reset for next thread
  }

  threadProgressBar.complete(`Completed processing ${tweetIds.length} thread(s)`);
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
      Deno.exit(0);
    }
  }

  globalThis.addEventListener("unload", cleanup);

  const args = Deno.args;
  const testIndex = args.indexOf("--test");
  const testMode = testIndex !== -1;

  // Ensure Chrome is installed (with error handling for cache cleanup issues)
  try {
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
        const percentage = Math.round((downloadedBytes / totalBytes) * 100);
        // Use a simple line overwrite for Chrome download progress
        Deno.stdout.writeSync(
          new TextEncoder().encode(`\r🌐 Installing Chrome: ${percentage}%`)
        );
        if (percentage === 100) {
          Deno.stdout.writeSync(new TextEncoder().encode('\n'));
        }
      },
    });
  } catch (error) {
    // Handle cache cleanup errors gracefully - check multiple error properties
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    const errorErrno = (error as any)?.errno;

    if (
      errorMessage.includes("ENOTEMPTY") ||
      errorMessage.includes("directory not empty") ||
      errorCode === "ENOTEMPTY" ||
      errorErrno === -66 // ENOTEMPTY errno on macOS
    ) {
      logger.debug(
        "Chrome installation cache cleanup failed (non-critical):",
        errorMessage,
      );
      // Continue execution - Chrome is likely already installed and functional
    } else {
      // Re-throw other installation errors as they might be critical
      throw error;
    }
  }

  const browserProps = testMode
    ? {
      headless: false,
      slowMo: 50,
    }
    : {
      headless: true,
      slowMo: Math.floor(Math.random() * 150) + 750,
    };

  logger.info(testMode ? "Launching test mode..." : "Launching...");

  const launchOptions: Record<string, unknown> = {
    ...browserProps,
    channel: "chrome",
  };

  if (Deno.env.get("CHROME_PATH")) {
    launchOptions.executablePath = Deno.env.get("CHROME_PATH");
  }

  browser = await puppeteer.launch(launchOptions);

  page = await browser.newPage();

  // Load cookies from environment variables or cookies.txt file
  let cookies: Array<{ name: string; value: string; domain: string }> = [];

  // Try to load from cookies.txt file first
  try {
    const cookiesPath = join(__dirname, "../cookies.txt");
    const cookiesContent = await Deno.readTextFile(cookiesPath);

    cookies = cookiesContent
      .split("\n")
      .filter((line) => line.startsWith(".x.com"))
      .map((line) => {
        const parts = line.split("\t");
        if (parts.length >= 7 && parts[5] && parts[6]) {
          return {
            name: parts[5],
            value: parts[6],
            domain: "x.com",
          };
        }
        return null;
      })
      .filter((
        cookie,
      ): cookie is { name: string; value: string; domain: string } =>
        cookie !== null
      );

    if (cookies.length > 0) {
      logger.info("Loaded cookies from cookies.txt");
    }
  } catch (error) {
    logger.debug(
      "Could not load cookies.txt, using environment variables",
      error,
    );
  }

  // Fallback to environment variables if no cookies.txt
  if (cookies.length === 0) {
    cookies = [
      { name: "twid", value: Deno.env.get("twid") || "", domain: "x.com" },
      {
        name: "auth_token",
        value: Deno.env.get("auth_token") || "",
        domain: "x.com",
      },
      { name: "lang", value: Deno.env.get("lang") || "", domain: "x.com" },
      {
        name: "d_prefs",
        value: Deno.env.get("d_prefs") || "",
        domain: "x.com",
      },
      { name: "kdt", value: Deno.env.get("kdt") || "", domain: "x.com" },
      { name: "ct0", value: Deno.env.get("ct0") || "", domain: "x.com" },
      {
        name: "guest_id",
        value: Deno.env.get("guest_id") || "",
        domain: "x.com",
      },
      {
        name: "domain",
        value: "https://x.com/",
        domain: "x.com",
      },
    ];
  }

  logger.debug("Setting cookies");
  await page.setCookie(...cookies);

  await page.emulate(iPhone15ProMax);

  try {
    if (testMode) {
      const tweetId = args[testIndex + 1];
      if (!tweetId) {
        logger.error("Please provide a tweet ID after --test");
        Deno.exit(1);
      }

      // Auto-detect the correct username for this tweet
      let detectedUsername: string;
      try {
        detectedUsername = await detectUsernameForTweet(page, tweetId);
        logger.info(
          `Using detected username: ${detectedUsername} for tweet ID: ${tweetId}`,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("not found or inaccessible")
        ) {
          logger.error(`Stopping processing: ${error.message}`);
          return; // Exit gracefully instead of crashing
        }
        throw error; // Re-throw other errors
      }

      await page.goto(`https://x.com/${detectedUsername}/status/${tweetId}`);
      logger.debug("Waiting for selector");
      await page.waitForSelector('div[data-testid="tweetText"]', {
        timeout: 30000,
      });

      const tweet = await parseTweet({ page });
      try {
        await rejectCookies(page);
        logger.debug("Cookies rejected, closed the popup");
      } catch {
        logger.debug("Could not reject cookies and close the popup");
      }

      await fetchSingleTweet({ page, expectedAuthor: tweet.author });
      logger.info("Correct exit");
    } else {
      const existingTweetsData = JSON.parse(
        await Deno.readTextFile(
          join(__dirname, "../infrastructure/db/tweets.json"),
        ),
      );
      // Note: turras.csv has been removed - tweets now come directly from existing tweets.json
      const tweets: TweetCSV[] = [];

      // If a tweet ID is provided as argument, add it to the processing list
      if (args.length > 0 && args[0] && /^\d{15,20}$/.test(args[0])) {
        tweets.push({ id: args[0] } as TweetCSV);
        logger.info(`Adding tweet ID from argument: ${args[0]}`);
      }

      const existingTweets = existingTweetsData.reduce(
        (acc: string[], tweets: Tweet[]) => {
          if (tweets && tweets.length > 0 && tweets[0]) {
            acc.push(tweets[0].id);
          }
          return acc;
        },
        [],
      );

      const tweetIds = tweets
        .map((tweet) => tweet.id)
        .filter((id) => !existingTweets.includes(id));

      logger.info("Processing a total of tweets:", tweetIds.length);

      await getAllTweets({
        page,
        author: undefined,
        tweetIds,
        outputFilePath: join(
          __dirname,
          "../infrastructure/db/tweets.json",
        ),
      });
    }
  } finally {
    logger.info("¡Estaré aquí mismo!");
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  const logger = createDenoLogger("recorder");

  // Handle ENOTEMPTY errors gracefully (Chrome cache cleanup issues)
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code;
  const errorErrno = (error as any)?.errno;

  if (
    errorMessage.includes("ENOTEMPTY") ||
    errorMessage.includes("directory not empty") ||
    errorCode === "ENOTEMPTY" ||
    errorErrno === -66 // ENOTEMPTY errno on macOS
  ) {
    logger.debug("Chrome cache cleanup failed (non-critical):", errorMessage);
    // Exit normally - this is a known non-critical issue
    Deno.exit(0);
  } else {
    // Log other errors normally
    logger.error("Main function error:", error);
    Deno.exit(1);
  }
});
