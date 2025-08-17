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
 * Fetch all tweets in a thread from the current page
 * This is the preferred method for thread scraping
 * Now includes reply-based thread detection and extraction
 */
async function fetchCompleteThread(
  page: Page,
  expectedAuthor: string,
  threadId: string
): Promise<Tweet[]> {
  logger.debug(`Fetching complete thread for ${threadId} by author ${expectedAuthor}`);
  
  // Wait for the thread to load completely
  await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Strategy 0: Search for and click "Show replies" button first
  logger.debug("Searching for 'Show replies' button");
  const showRepliesClicked = await page.evaluate(() => {
    // Search for "Show replies" button using various selectors
    const possibleSelectors = [
      // Look for text content containing "Show replies"
      'div[role="button"]',
      'button[role="button"]', 
      'span',
      'div[class*="css-175oi2r"]',
      'div[data-testid="cellInnerDiv"]'
    ];
    
    for (const selector of possibleSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const element of elements) {
        const text = element.textContent || '';
        if (text.toLowerCase().includes('show replies') || 
            text.toLowerCase().includes('show more replies') ||
            text.toLowerCase().includes('read') && text.toLowerCase().includes('replies')) {
          try {
            (element as HTMLElement).click();
            return true;
          } catch (e) {
            // Try clicking parent element
            try {
              if (element.parentElement) {
                (element.parentElement as HTMLElement).click();
                return true;
              }
            } catch (e2) {
              // Continue searching
            }
          }
        }
      }
    }
    return false;
  });
  
  if (showRepliesClicked) {
    logger.debug("Successfully clicked 'Show replies' button, waiting for content to load");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // After clicking, do some scrolling to load all replies
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // Strategy 1: Check if this is a reply-based thread
  const hasReplies = await page.evaluate(() => {
    const replyButtons = Array.from(document.querySelectorAll('*'));
    return replyButtons.some(el => {
      const text = el.textContent || '';
      return text.includes('replies') || text.includes('Read') && text.includes('replies');
    });
  });
  
  if (hasReplies) {
    logger.debug("Reply-based thread detected, attempting direct approach");
    
    // Strategy: Navigate directly to /with_replies endpoint
    const repliesUrl = `https://x.com/${expectedAuthor}/status/${threadId}/with_replies`;
    logger.debug(`Trying replies URL: ${repliesUrl}`);
    
    try {
      await page.goto(repliesUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Scroll to load all replies
      let previousHeight = 0;
      let unchangedCount = 0;
      
      for (let i = 0; i < 40; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
          unchangedCount++;
          if (unchangedCount >= 4) break;
        } else {
          unchangedCount = 0;
          previousHeight = currentHeight;
        }
      }
      
      // Extract all tweets including replies
      const replyTweets = await page.evaluate((expectedUsername: string) => {
        const tweetElements = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        const threadTweets: Tweet[] = [];
        
        for (const element of tweetElements) {
          try {
            const timeElement = element.querySelector('time');
            const timeParent = timeElement?.parentElement as HTMLAnchorElement;
            const href = timeParent?.href;
            
            if (!href) continue;
            
            const idMatch = href.match(/status\/(\d+)/);
            if (!idMatch) continue;
            
            const currentTweetId = idMatch[1];
            
            const textElement = element.querySelector('[data-testid="tweetText"]');
            const tweetText = textElement?.textContent || '';
            
            if (!tweetText.trim()) continue;
            
            // Check if this is from the expected author
            const authorElement = element.querySelector('[data-testid="User-Name"] a');
            const authorHref = (authorElement as HTMLAnchorElement)?.href;
            
            if (!authorHref || !authorHref.toLowerCase().includes(expectedUsername.toLowerCase())) {
              continue;
            }
            
            const timeValue = timeElement?.getAttribute('datetime');
            
            const replyElement = element.querySelector('[data-testid="reply"]');
            const retweetElement = element.querySelector('[data-testid="retweet"]');
            const likeElement = element.querySelector('[data-testid="like"]');
            const bookmarkElement = element.querySelector('[data-testid="bookmark"]');
            
            const getStatValue = (el: Element | null): string => {
              const text = el?.getAttribute('aria-label') || '';
              const match = text.match(/(\d+(?:,\d+)*)/);
              return match?.[1] || '0';
            };
            
            const imgElements = element.querySelectorAll('img[src*="pbs.twimg.com"]');
            const imgs = Array.from(imgElements).map(img => ({
              src: (img as HTMLImageElement).src,
              alt: (img as HTMLImageElement).alt || 'Image'
            }));
            
            const metadata: TweetMetadata = {};
            if (imgs.length > 0) {
              metadata.type = 'image';
              metadata.imgs = imgs;
            }
            
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
                views: '0'
              }
            };
            
            threadTweets.push(tweet);
          } catch (error) {
            continue;
          }
        }
        
        return threadTweets;
      }, expectedAuthor);
      
      if (replyTweets.length > 5) {
        logger.debug(`Reply-based extraction yielded ${replyTweets.length} tweets`);
        const uniqueTweets = replyTweets.filter((tweet, index, array) => 
          array.findIndex(t => t.id === tweet.id) === index
        );
        uniqueTweets.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        return uniqueTweets;
      }
    } catch (error) {
      logger.debug("Direct replies approach failed, continuing with normal strategies");
    }
  }
  
  // Strategy: Scroll first to load content, then try to expand
  let allTweets: Tweet[] = [];
  let bestCount = 0;
  
  // Phase 1: Try expansion approach
  const hasThreadIndicator = await page.evaluate(() => {
    const threadIndicators = [
      'Show this thread',
      'Show more replies', 
      'thread',
      'hilo',
      '🧵'
    ];
    
    const pageText = document.body.textContent || '';
    return threadIndicators.some(indicator => 
      pageText.toLowerCase().includes(indicator.toLowerCase())
    );
  });

  if (hasThreadIndicator) {
    logger.debug("Thread indicator found, attempting expansion + careful scrolling");
    
    try {
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div[role="button"], a[role="button"], span'));
        for (const button of buttons) {
          const text = button.textContent || '';
          if (text.toLowerCase().includes('show this thread') || 
              text.toLowerCase().includes('more replies') ||
              text.toLowerCase().includes('hilo') ||
              text.includes('🧵')) {
            (button as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      
      if (clicked) {
        logger.debug("Successfully clicked thread expansion button");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Light scrolling after expansion to reveal more content
        for (let i = 0; i < 10; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight * 0.5);
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check for "Show more" buttons every few scrolls  
          if (i % 3 === 0) {
            try {
              await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"], span'));
                for (const button of buttons) {
                  const text = (button.textContent || '').toLowerCase();
                  if (text.includes('show more') || text.includes('more replies')) {
                    (button as HTMLElement).click();
                    break;
                  }
                }
              });
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              // Ignore click errors
            }
          }
        }
        
        // Extract tweets after expansion + scrolling
        const expandedTweets = await page.evaluate((expectedUsername: string) => {
          const tweetElements = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
          const threadTweets: Tweet[] = [];
          
          for (const element of tweetElements) {
            try {
              const timeElement = element.querySelector('time');
              const timeParent = timeElement?.parentElement as HTMLAnchorElement;
              const href = timeParent?.href;
              
              if (!href) continue;
              
              const idMatch = href.match(/status\/(\d+)/);
              if (!idMatch) continue;
              
              const currentTweetId = idMatch[1];
              
              const textElement = element.querySelector('[data-testid="tweetText"]');
              const tweetText = textElement?.textContent || '';
              
              if (!tweetText.trim()) continue;
              
              const authorElement = element.querySelector('[data-testid="User-Name"] a');
              const authorHref = (authorElement as HTMLAnchorElement)?.href;
              
              if (!authorHref || !authorHref.toLowerCase().includes(expectedUsername.toLowerCase())) {
                continue;
              }
              
              const timeValue = timeElement?.getAttribute('datetime');
              
              const replyElement = element.querySelector('[data-testid="reply"]');
              const retweetElement = element.querySelector('[data-testid="retweet"]');
              const likeElement = element.querySelector('[data-testid="like"]');
              const bookmarkElement = element.querySelector('[data-testid="bookmark"]');
              
              const getStatValue = (el: Element | null): string => {
                const text = el?.getAttribute('aria-label') || '';
                const match = text.match(/(\d+(?:,\d+)*)/);
                return match?.[1] || '0';
              };
              
              const imgElements = element.querySelectorAll('img[src*="pbs.twimg.com"]');
              const imgs = Array.from(imgElements).map(img => ({
                src: (img as HTMLImageElement).src,
                alt: (img as HTMLImageElement).alt || 'Image'
              }));
              
              const metadata: TweetMetadata = {};
              if (imgs.length > 0) {
                metadata.type = 'image';
                metadata.imgs = imgs;
              }
              
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
                  views: '0'
                }
              };
              
              threadTweets.push(tweet);
            } catch (error) {
              continue;
            }
          }
          
          return threadTweets;
        }, expectedAuthor);
        
        if (expandedTweets.length > bestCount) {
          allTweets = expandedTweets;
          bestCount = expandedTweets.length;
          logger.debug(`Expansion approach yielded ${bestCount} tweets`);
        }
      }
    } catch (error) {
      logger.debug("Could not expand thread automatically");
    }
  }
  
  // Phase 2: If we didn't get a good result, try traditional scrolling on fresh page
  if (bestCount < 5) {
    logger.debug("Trying fresh page approach with traditional scrolling");
    
    // Reload the page for a fresh start
    await page.goto(`https://x.com/${expectedAuthor}/status/${threadId}`);
    await page.waitForSelector('article[data-testid="tweet"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Traditional scrolling approach
    let currentTweetCount = 0;
    let stableCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 100; // Aumentado significativamente
    const maxStableAttempts = 8; // Más intentos estables
    
    do {
      const previousTweetCount = currentTweetCount;
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      currentTweetCount = await page.evaluate((authorName: string) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        let count = 0;
        for (const article of articles) {
          const authorElement = article.querySelector('[data-testid="User-Name"] a');
          const authorHref = (authorElement as HTMLAnchorElement)?.href;
          if (authorHref && authorHref.toLowerCase().includes(authorName.toLowerCase())) {
            count++;
          }
        }
        return count;
      }, expectedAuthor);
      
      if (currentTweetCount === previousTweetCount) {
        stableCount++;
      } else {
        stableCount = 0;
        logger.debug(`Traditional scroll ${scrollAttempts + 1}: Found ${currentTweetCount} tweets`);
      }
      
      scrollAttempts++;
      
    } while (stableCount < maxStableAttempts && scrollAttempts < maxScrollAttempts);
    
    // Extract tweets from traditional approach
    const traditionalTweets = await page.evaluate((expectedUsername: string) => {
      const tweetElements = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
      const threadTweets: Tweet[] = [];
      
      for (const element of tweetElements) {
        try {
          const timeElement = element.querySelector('time');
          const timeParent = timeElement?.parentElement as HTMLAnchorElement;
          const href = timeParent?.href;
          
          if (!href) continue;
          
          const idMatch = href.match(/status\/(\d+)/);
          if (!idMatch) continue;
          
          const currentTweetId = idMatch[1];
          
          const textElement = element.querySelector('[data-testid="tweetText"]');
          const tweetText = textElement?.textContent || '';
          
          if (!tweetText.trim()) continue;
          
          const authorElement = element.querySelector('[data-testid="User-Name"] a');
          const authorHref = (authorElement as HTMLAnchorElement)?.href;
          
          if (!authorHref || !authorHref.toLowerCase().includes(expectedUsername.toLowerCase())) {
            continue;
          }
          
          const timeValue = timeElement?.getAttribute('datetime');
          
          const replyElement = element.querySelector('[data-testid="reply"]');
          const retweetElement = element.querySelector('[data-testid="retweet"]');
          const likeElement = element.querySelector('[data-testid="like"]');
          const bookmarkElement = element.querySelector('[data-testid="bookmark"]');
          
          const getStatValue = (el: Element | null): string => {
            const text = el?.getAttribute('aria-label') || '';
            const match = text.match(/(\d+(?:,\d+)*)/);
            return match?.[1] || '0';
          };
          
          const imgElements = element.querySelectorAll('img[src*="pbs.twimg.com"]');
          const imgs = Array.from(imgElements).map(img => ({
            src: (img as HTMLImageElement).src,
            alt: (img as HTMLImageElement).alt || 'Image'
          }));
          
          const metadata: TweetMetadata = {};
          if (imgs.length > 0) {
            metadata.type = 'image';
            metadata.imgs = imgs;
          }
          
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
              views: '0'
            }
          };
          
          threadTweets.push(tweet);
        } catch (error) {
          continue;
        }
      }
      
      return threadTweets;
    }, expectedAuthor);
    
    if (traditionalTweets.length > bestCount) {
      allTweets = traditionalTweets;
      bestCount = traditionalTweets.length;
      logger.debug(`Traditional approach yielded ${bestCount} tweets`);
    }
  }
  
  // Phase 3: Ultra-aggressive approach - multiple strategies combined
  if (bestCount < 25) { // Si aún no tenemos suficientes tweets
    logger.debug("Attempting ultra-aggressive multi-strategy approach");
    
    // Solo un intento pero mucho más eficiente
    for (let attempt = 0; attempt < 1; attempt++) {
      await page.goto(`https://x.com/${expectedAuthor}/status/${threadId}`);
      await page.waitForSelector('article[data-testid="tweet"]');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Búsqueda exhaustiva de botones de expansión
      for (let expansionAttempt = 0; expansionAttempt < 5; expansionAttempt++) {
        await page.evaluate(() => {
          const possibleButtons = [
            ...Array.from(document.querySelectorAll('div[role="button"], a[role="button"], span, button')),
            ...Array.from(document.querySelectorAll('[data-testid="reply"], [data-testid="retweet"]'))
          ];
          
          for (const button of possibleButtons) {
            const text = (button.textContent || '').toLowerCase();
            const ariaLabel = button.getAttribute('aria-label') || '';
            
            if (text.includes('show this thread') || 
                text.includes('show more') ||
                text.includes('more replies') ||
                text.includes('hilo') ||
                text.includes('thread') ||
                text.includes('🧵') ||
                ariaLabel.toLowerCase().includes('thread') ||
                ariaLabel.toLowerCase().includes('more')) {
              try {
                (button as HTMLElement).click();
              } catch (e) {
                // Ignore click errors
              }
            }
          }
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Scroll ultra-agresivo con detección de contenido nuevo
      let previousHeight = 0;
      let unchangedCount = 0;
      const maxUnchangedAttempts = 6;
      
      for (let scrollIndex = 0; scrollIndex < 80; scrollIndex++) { // Hasta 80 scrolls
        // Alternar entre diferentes tipos de scroll
        if (scrollIndex % 3 === 0) {
          // Scroll completo hacia abajo
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        } else if (scrollIndex % 3 === 1) {
          // Scroll gradual
          await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        } else {
          // Scroll intermedio
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verificar si el contenido ha cambiado
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
          unchangedCount++;
          if (unchangedCount >= maxUnchangedAttempts) {
            logger.debug(`No new content after ${unchangedCount} attempts, stopping scroll`);
            break;
          }
          // Si hemos hecho más de 30 scrolls sin cambios, ser más agresivo
          if (scrollIndex > 30 && unchangedCount >= 3) {
            logger.debug(`After ${scrollIndex} scrolls with ${unchangedCount} unchanged, stopping early`);
            break;
          }
        } else {
          unchangedCount = 0;
          previousHeight = currentHeight;
        }
        
        // Cada 10 scrolls, intentar hacer click en posibles botones
        if (scrollIndex % 10 === 0) {
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"], span'));
            for (const button of buttons) {
              const text = (button.textContent || '').toLowerCase();
              if (text.includes('show more') || text.includes('load more') || text.includes('more tweets')) {
                try {
                  (button as HTMLElement).click();
                } catch (e) {}
              }
            }
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Extraer tweets después de este intento agresivo
      const aggressiveTweets = await page.evaluate((expectedUsername: string) => {
        const tweetElements = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        const threadTweets: Tweet[] = [];
        
        for (const element of tweetElements) {
          try {
            const timeElement = element.querySelector('time');
            const timeParent = timeElement?.parentElement as HTMLAnchorElement;
            const href = timeParent?.href;
            
            if (!href) continue;
            
            const idMatch = href.match(/status\/(\d+)/);
            if (!idMatch) continue;
            
            const currentTweetId = idMatch[1];
            
            const textElement = element.querySelector('[data-testid="tweetText"]');
            const tweetText = textElement?.textContent || '';
            
            if (!tweetText.trim()) continue;
            
            const authorElement = element.querySelector('[data-testid="User-Name"] a');
            const authorHref = (authorElement as HTMLAnchorElement)?.href;
            
            if (!authorHref || !authorHref.toLowerCase().includes(expectedUsername.toLowerCase())) {
              continue;
            }
            
            const timeValue = timeElement?.getAttribute('datetime');
            
            const replyElement = element.querySelector('[data-testid="reply"]');
            const retweetElement = element.querySelector('[data-testid="retweet"]');
            const likeElement = element.querySelector('[data-testid="like"]');
            const bookmarkElement = element.querySelector('[data-testid="bookmark"]');
            
            const getStatValue = (el: Element | null): string => {
              const text = el?.getAttribute('aria-label') || '';
              const match = text.match(/(\d+(?:,\d+)*)/);
              return match?.[1] || '0';
            };
            
            const imgElements = element.querySelectorAll('img[src*="pbs.twimg.com"]');
            const imgs = Array.from(imgElements).map(img => ({
              src: (img as HTMLImageElement).src,
              alt: (img as HTMLImageElement).alt || 'Image'
            }));
            
            const metadata: TweetMetadata = {};
            if (imgs.length > 0) {
              metadata.type = 'image';
              metadata.imgs = imgs;
            }
            
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
                views: '0'
              }
            };
            
            threadTweets.push(tweet);
          } catch (error) {
            continue;
          }
        }
        
        return threadTweets;
      }, expectedAuthor);
      
      if (aggressiveTweets.length > bestCount) {
        allTweets = aggressiveTweets;
        bestCount = aggressiveTweets.length;
        logger.debug(`Ultra-aggressive approach attempt ${attempt + 1} yielded ${bestCount} tweets`);
        
        // Si encontramos el texto objetivo, podemos parar
        const hasTargetText = aggressiveTweets.some(tweet => 
          tweet.tweet.includes('P.D.III: Otro mini arco de hilos relevantes')
        );
        if (hasTargetText) {
          logger.info("Found target text! Thread appears complete.");
          break;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Final cleanup and sorting
  const uniqueTweets = allTweets.filter((tweet, index, array) => 
    array.findIndex(t => t.id === tweet.id) === index
  );
  
  uniqueTweets.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  
  logger.info(`Found ${uniqueTweets.length} tweets in thread ${threadId} by ${expectedAuthor}`);
  return uniqueTweets;
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
      
      logger.info(`Successfully added thread ${tweetId} with ${threadTweets.length} tweets`);
    } else {
      logger.warn(`No tweets found for thread ${tweetId}`);
    }
    
    author = undefined; // Reset for next thread
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
  logger.error("Main function error:", error);
});
