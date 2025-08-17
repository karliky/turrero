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
import { TweetMetadataType } from "../infrastructure/types/index.ts";

// Load environment variables (try .env.local first, then .env)
try {
  dotenv.config({ path: ".env.local" });
} catch {
  dotenv.config();
}

// Initialize logger
const logger = createDenoLogger("recorder");

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

    const imgs = Array.from(article.querySelectorAll('img[alt="Image"]'))
      .map((img: Element) => ({
        src: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt,
      }));

    return {
      type: imgs.length > 0 ? 'image' : undefined,
      imgs: imgs.length > 0 ? imgs : undefined,
      embed: { tweet: undefined },
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
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Check if the page loaded successfully (don't wait for tweet content yet)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if we're on an error page or if the tweet doesn't exist
    const currentUrl = page.url();
    const pageContent = await page.content();
    if (pageContent.includes('This Tweet was deleted') || 
        pageContent.includes('Tweet not found') ||
        pageContent.includes('Page doesn\'t exist') ||
        currentUrl.includes('/login') ||
        currentUrl.includes('/signup') ||
        !currentUrl.includes('/status/')) {
      logger.warn(`Tweet ${tweetId} appears to be deleted, doesn't exist, or requires authentication`);
      return "Recuenco"; // Return default for non-existent tweets
    }

    // Extract username from page content using multiple strategies
    const detectedUsername = await page.evaluate(() => {
      // Strategy 1: Look for profile links in the tweet
      const profileLinks = Array.from(document.querySelectorAll('a[href*="x.com/"]'))
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          const match = href.match(/x\.com\/([^\/\?]+)(?:\/status\/\d+)?$/);
          const excluded = ['i', 'search', 'home', 'notifications', 'messages', 'settings', 'explore'];
          return match && match[1] && !excluded.includes(match[1]) && !match[1].includes('?');
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
      const authorElement = document.querySelector('[data-testid="User-Name"] a[role="link"]');
      if (authorElement) {
        const href = (authorElement as HTMLAnchorElement).href;
        const match = href.match(/x\.com\/([^\/\?]+)/);
        const excluded = ['i', 'search', 'home', 'notifications', 'messages', 'settings', 'explore'];
        if (match && match[1] && !excluded.includes(match[1])) {
          return match[1];
        }
      }

      // Strategy 3: Look for canonical URL or meta tags
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
      if (canonical) {
        const match = canonical.match(/x\.com\/([^\/]+)\/status/);
        const excluded = ['i', 'search', 'home', 'notifications', 'messages', 'settings', 'explore'];
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
          const excluded = ['i', 'search', 'home', 'notifications', 'messages', 'settings', 'explore'];
          if (match && match[1] && !excluded.includes(match[1])) {
            return match[1];
          }
        }
      }

      // Strategy 5: Look in the page structure for user data
      const userNameElements = document.querySelectorAll('[data-testid="User-Name"]');
      for (const element of userNameElements) {
        const link = element.querySelector('a[href*="x.com/"]');
        if (link) {
          const href = (link as HTMLAnchorElement).href;
          const match = href.match(/x\.com\/([^\/\?]+)$/);
          const excluded = ['i', 'search', 'home', 'notifications', 'messages', 'settings', 'explore'];
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
      logger.info(`Successfully detected username: ${detectedUsername} for tweet ID: ${tweetId} in ${duration}ms`);
      return detectedUsername;
    } else {
      logger.warn(`Could not detect username for tweet ${tweetId} in ${duration}ms, trying fallback`);
      
      // Fallback: Try to extract from any visible user information
      const fallbackUsername = await page.evaluate(() => {
        // Look for any @username mentions in the page that aren't system accounts
        const textContent = document.body.textContent || '';
        const atMentions = textContent.match(/@([a-zA-Z0-9_]+)/g);
        if (atMentions && atMentions.length > 0) {
          // Filter out system/generic accounts and return the first real username
          const systemAccounts = ['twitter', 'x', 'support', 'privacy', 'tos', 'help'];
          for (const mention of atMentions) {
            const username = mention.substring(1);
            if (!systemAccounts.includes(username.toLowerCase()) && username.length > 2) {
              return username;
            }
          }
        }
        return null;
      });

      if (fallbackUsername) {
        logger.info(`Detected username via fallback: ${fallbackUsername} for tweet ID: ${tweetId} in ${duration}ms`);
        return fallbackUsername;
      }

      // Check if this tweet might not exist at all
      if (pageContent.includes('Something went wrong') || 
          pageContent.includes('Try again') ||
          pageContent.includes('Rate limit exceeded') ||
          pageContent.length < 1000) { // Very short page content suggests error page
        logger.error(`Tweet ${tweetId} appears to be inaccessible or doesn't exist (page content: ${pageContent.length} chars)`);
        throw new Error(`Tweet ${tweetId} not found or inaccessible`);
      }
      
      // Last resort: Use a common default
      logger.warn(`Could not detect username for tweet ${tweetId}, defaulting to Recuenco after ${duration}ms`);
      return "Recuenco";
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // If it's our custom "tweet not found" error, re-throw it so main function can handle it
    if (error instanceof Error && error.message.includes('not found or inaccessible')) {
      throw error;
    }
    
    logger.error(`Error detecting username for tweet ${tweetId} after ${duration}ms:`, error);
    
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
  for (const tweetId of tweetIds) {
    // Auto-detect username if not provided
    if (author === undefined) {
      author = await detectUsernameForTweet(page, tweetId);
      logger.info("Auto-detected author: ", author);
    }

    await page.goto(
      `https://x.com/${author}/status/${tweetId}`,
    );
    logger.debug("Waiting for selector");
    await page.waitForSelector('div[data-testid="tweetText"]');
    try {
      await rejectCookies(page);
      logger.debug("Cookies rejected, closed the popup");
    } catch {
      logger.debug("Could not reject cookies and close the popup");
    }

    let stopped = false;
    const tweets: Tweet[] = [];

    while (!stopped) {
      const { tweet, mustStop } = await fetchSingleTweet({
        page,
        expectedAuthor: author,
      });

      if (mustStop) {
        stopped = true;
        const existingTweets = JSON.parse(
          await Deno.readTextFile(outputFilePath),
        );
        existingTweets.push(tweets);
        await Deno.writeTextFile(
          outputFilePath,
          JSON.stringify(existingTweets, null, 4),
        );
        author = undefined;
        break;
      }

      tweets.push(tweet);
      logger.debug("finding lastTweetFound");
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

        await Promise.all([
          page.waitForSelector('div[role="progressbar"]', {
            hidden: true,
          }),
          page.evaluate(() => {
            return new Promise<void>((resolve, reject) => {
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
                  reject(
                    new Error(
                      "Could not find current tweet",
                    ),
                  );
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
                  reject(
                    new Error("Could not find cell div"),
                  );
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
                  reject(
                    new Error("Could not find next tweet"),
                  );
                  return;
                }

                nextTweet.click();
                resolve();
              };

              tryClick();
            });
          }),
          page.waitForNavigation({ timeout: 10000 }),
        ]);
      } catch (error) {
        logger.error("Navigation error:", error);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await page.reload();
        await page.waitForSelector(
          'article[tabindex="-1"][role="article"][data-testid="tweet"]',
          { timeout: 5000 },
        );
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
      Deno.exit(0);
    }
  }

  globalThis.addEventListener("unload", cleanup);

  const args = Deno.args;
  const testIndex = args.indexOf("--test");
  const testMode = testIndex !== -1;

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
        if (error instanceof Error && error.message.includes('not found or inaccessible')) {
          logger.error(`Stopping processing: ${error.message}`);
          return; // Exit gracefully instead of crashing
        }
        throw error; // Re-throw other errors
      }

      await page.goto(`https://x.com/${detectedUsername}/status/${tweetId}`);
      logger.debug("Waiting for selector");
      await page.waitForSelector('div[data-testid="tweetText"]');

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
  logger.error("Main function error:", error);
});
