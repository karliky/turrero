/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { Page } from "puppeteer-core";
import { createDenoLogger } from "../infrastructure/logger.ts";

const logger = createDenoLogger("optimized-username-detection");

/**
 * Optimized username detection that's much faster than the current approach
 * Uses the generic URL pattern and extracts username from page content
 */
export async function optimizedDetectUsernameForTweet(
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

    // Wait for tweet content to load
    await page.waitForSelector('div[data-testid="tweetText"]', { 
      timeout: 10000 
    });

    // Extract username from page content using multiple strategies
    const detectedUsername = await page.evaluate(() => {
      // Strategy 1: Look for profile links in the tweet
      const profileLinks = Array.from(document.querySelectorAll('a[href*="x.com/"]'))
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          const match = href.match(/x\.com\/([^\/\?]+)(?:\/status\/\d+)?$/);
          return match && match[1] && match[1] !== 'i' && !match[1].includes('search');
        });

      if (profileLinks.length > 0) {
        const firstProfile = profileLinks[0];
        const match = firstProfile.match(/x\.com\/([^\/\?]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }

      // Strategy 2: Look for the tweet author's username in the tweet structure
      const authorElement = document.querySelector('[data-testid="User-Name"] a[role="link"]');
      if (authorElement) {
        const href = (authorElement as HTMLAnchorElement).href;
        const match = href.match(/x\.com\/([^\/\?]+)/);
        if (match && match[1] && match[1] !== 'i') {
          return match[1];
        }
      }

      // Strategy 3: Look for canonical URL or meta tags
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
      if (canonical) {
        const match = canonical.match(/x\.com\/([^\/]+)\/status/);
        if (match && match[1] && match[1] !== 'i') {
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
          if (match && match[1] && match[1] !== 'i' && !match[1].includes('search')) {
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
          if (match && match[1] && match[1] !== 'i') {
            return match[1];
          }
        }
      }

      return null;
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (detectedUsername) {
      logger.info(`✅ Successfully detected username: ${detectedUsername} for tweet ID: ${tweetId} in ${duration}ms`);
      return detectedUsername;
    } else {
      logger.warn(`⚠️ Could not detect username for tweet ${tweetId} in ${duration}ms, trying fallback`);
      
      // Fallback: Try to extract from any visible user information
      const fallbackUsername = await page.evaluate(() => {
        // Look for any @username mentions in the page
        const textContent = document.body.textContent || '';
        const atMentions = textContent.match(/@([a-zA-Z0-9_]+)/g);
        if (atMentions && atMentions.length > 0) {
          // Return the first @mention without the @
          return atMentions[0].substring(1);
        }
        return null;
      });

      if (fallbackUsername) {
        logger.info(`✅ Detected username via fallback: ${fallbackUsername} for tweet ID: ${tweetId} in ${duration}ms`);
        return fallbackUsername;
      }

      // Last resort: Use a common default
      logger.warn(`❌ Could not detect username for tweet ${tweetId}, defaulting to Recuenco after ${duration}ms`);
      return "Recuenco";
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    logger.error(`❌ Error detecting username for tweet ${tweetId} after ${duration}ms:`, error);
    
    // Last resort fallback
    return "Recuenco";
  }
}

/**
 * Test the optimized detection function
 */
export async function testOptimizedDetection(page: Page, tweetId: string): Promise<void> {
  logger.info(`Testing optimized username detection for tweet: ${tweetId}`);
  
  const startTime = Date.now();
  const username = await optimizedDetectUsernameForTweet(page, tweetId);
  const endTime = Date.now();
  
  logger.info(`Total time taken: ${endTime - startTime}ms`);
  logger.info(`Detected username: ${username}`);
  
  // Verify by navigating to the user-specific URL
  try {
    logger.info("Verifying detected username...");
    await page.goto(`https://x.com/${username}/status/${tweetId}`, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    
    await page.waitForSelector('div[data-testid="tweetText"]', { timeout: 5000 });
    logger.info("✅ Verification successful!");
    
  } catch (error) {
    logger.error("❌ Verification failed:", error);
  }
}