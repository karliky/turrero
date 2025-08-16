/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import puppeteer from "puppeteer-core";
import { dirname, join } from "@std/path";
import { createDenoLogger } from "../infrastructure/logger.ts";

const logger = createDenoLogger("username-detection-test");
const __dirname = dirname(new URL(import.meta.url).pathname);

// iPhone 12 device configuration
const iPhone12 = {
    name: "iPhone 12",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
    viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false,
    },
};

/**
 * Test different approaches to detect username efficiently
 */
async function testUsernameDetection(tweetId: string) {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        channel: "chrome",
    });

    const page = await browser.newPage();
    
    // Load cookies from cookies.txt file
    try {
        const cookiesPath = join(__dirname, "../cookies.txt");
        const cookiesContent = await Deno.readTextFile(cookiesPath);
        
        const cookies = cookiesContent
            .split('\n')
            .filter(line => line.startsWith('.x.com'))
            .map(line => {
                const parts = line.split('\t');
                if (parts.length >= 7 && parts[5] && parts[6]) {
                    return {
                        name: parts[5],
                        value: parts[6],
                        domain: "x.com"
                    };
                }
                return null;
            })
            .filter((cookie): cookie is {name: string, value: string, domain: string} => cookie !== null);
            
        logger.info(`Loaded ${cookies.length} cookies from cookies.txt`);
        await page.setCookie(...cookies);
    } catch (error) {
        logger.error("Could not load cookies:", error);
        await browser.close();
        return;
    }

    await page.emulate(iPhone12);

    logger.info("=== Testing Approach 1: Direct generic URL ===");
    
    // Approach 1: Try the generic URL and monitor redirects
    const startTime = Date.now();
    
    try {
        // Enable request interception to monitor redirects
        await page.setRequestInterception(true);
        
        const requests: Array<{url: string, method: string, redirectChain: string[]}> = [];
        
        page.on('request', (request) => {
            requests.push({
                url: request.url(),
                method: request.method(),
                redirectChain: request.redirectChain().map(r => r.url())
            });
            request.continue();
        });

        // Navigate to generic URL
        const response = await page.goto(`https://x.com/i/status/${tweetId}`, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        
        logger.info(`Approach 1 took ${duration}ms`);
        logger.info(`Final URL: ${page.url()}`);
        logger.info(`Response status: ${response?.status()}`);
        
        // Check if we got redirected to the actual tweet
        const finalUrl = page.url();
        const usernameMatch = finalUrl.match(/x\.com\/([^\/]+)\/status/);
        
        if (usernameMatch && usernameMatch[1] && usernameMatch[1] !== 'i') {
            logger.info(`✅ Successfully detected username: ${usernameMatch[1]}`);
            
            // Log all requests to understand the redirect pattern
            logger.info("Request chain:");
            requests.forEach((req, i) => {
                logger.info(`  ${i + 1}. ${req.method} ${req.url}`);
                if (req.redirectChain.length > 0) {
                    logger.info(`     Redirects: ${req.redirectChain.join(' -> ')}`);
                }
            });
        } else {
            logger.warn("❌ Could not detect username from URL");
        }

        // Approach 2: Try to extract from page metadata
        logger.info("\n=== Testing Approach 2: Page metadata extraction ===");
        
        try {
            const metaData = await page.evaluate(() => {
                // Try different metadata approaches
                const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
                const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
                const twitterUrl = document.querySelector('meta[name="twitter:url"]')?.getAttribute('content');
                
                // Try to find JSON-LD data
                const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                let jsonLdData = null;
                for (const script of jsonLdScripts) {
                    try {
                        const data = JSON.parse(script.textContent || '');
                        if (data.url || data.author) {
                            jsonLdData = data;
                            break;
                        }
                    } catch (e) {
                        // Ignore JSON parse errors
                    }
                }

                // Try to extract from page title or other elements
                const title = document.title;
                
                return {
                    canonical,
                    ogUrl,
                    twitterUrl,
                    jsonLdData,
                    title,
                    currentUrl: window.location.href
                };
            });

            logger.info("Page metadata:", metaData);
            
            // Extract username from any of these sources
            const sources = [metaData.canonical, metaData.ogUrl, metaData.twitterUrl, metaData.currentUrl];
            for (const source of sources) {
                if (source) {
                    const match = source.match(/x\.com\/([^\/]+)\/status/);
                    if (match && match[1] && match[1] !== 'i') {
                        logger.info(`✅ Username found in metadata: ${match[1]}`);
                        break;
                    }
                }
            }
        } catch (error) {
            logger.error("Error extracting metadata:", error);
        }

        // Approach 3: Try HEAD request approach (without full page load)
        logger.info("\n=== Testing Approach 3: HEAD request analysis ===");
        
        const headStartTime = Date.now();
        try {
            const headResponse = await page.evaluate(async (tweetId) => {
                const response = await fetch(`https://x.com/i/status/${tweetId}`, {
                    method: 'HEAD',
                    redirect: 'manual'
                });
                
                return {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    url: response.url,
                    redirected: response.redirected,
                    type: response.type
                };
            }, tweetId);
            
            const headEndTime = Date.now();
            logger.info(`HEAD request took ${headEndTime - headStartTime}ms`);
            logger.info("HEAD response:", headResponse);
            
            if (headResponse.headers.location) {
                const locationMatch = headResponse.headers.location.match(/x\.com\/([^\/]+)\/status/);
                if (locationMatch && locationMatch[1]) {
                    logger.info(`✅ Username found in HEAD redirect: ${locationMatch[1]}`);
                }
            }
        } catch (error) {
            logger.error("HEAD request failed:", error);
        }

    } catch (error) {
        logger.error("Navigation failed:", error);
    }

    // Wait a bit to inspect
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await browser.close();
}

// Main execution
if (import.meta.main) {
    const args = Deno.args;
    const tweetId = args[0] || "1857476584065012150"; // Default test tweet
    
    logger.info(`Testing username detection for tweet ID: ${tweetId}`);
    await testUsernameDetection(tweetId);
}