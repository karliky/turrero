/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import puppeteer from "puppeteer-core";
import { dirname, join } from "@std/path";
import { createDenoLogger } from "../infrastructure/logger.ts";

const logger = createDenoLogger("network-analysis");
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
 * Test network requests to understand X.com's API patterns
 */
async function analyzeNetworkRequests(tweetId: string) {
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

    // Enable request interception and logging
    await page.setRequestInterception(true);
    
    const networkRequests: Array<{
        url: string, 
        method: string, 
        resourceType: string,
        response?: {status: number, url: string, fromCache: boolean}
    }> = [];
    
    page.on('request', (request) => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            resourceType: request.resourceType()
        });
        request.continue();
    });

    page.on('response', (response) => {
        const request = networkRequests.find(req => req.url === response.request().url());
        if (request) {
            request.response = {
                status: response.status(),
                url: response.url(),
                fromCache: response.fromCache()
            };
        }
    });

    logger.info("=== Testing Network Requests with hardcoded username ===");
    
    // First, try with a hardcoded known username to see what requests are made
    const testUsername = "Recuenco";
    const startTime = Date.now();
    
    try {
        await page.goto(`https://x.com/${testUsername}/status/${tweetId}`, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        await page.waitForSelector('div[data-testid="tweetText"]', { timeout: 10000 });
        
        const endTime = Date.now();
        logger.info(`Network requests took ${endTime - startTime}ms`);
        
        // Analyze the network requests for patterns
        logger.info("\n=== API Requests Analysis ===");
        
        const apiRequests = networkRequests.filter(req => 
            req.url.includes('api') || 
            req.url.includes('graphql') || 
            req.url.includes('1.1') ||
            req.url.includes('2/timeline')
        );
        
        logger.info(`Found ${apiRequests.length} API requests:`);
        apiRequests.forEach((req, i) => {
            logger.info(`  ${i + 1}. ${req.method} ${req.url}`);
            if (req.response) {
                logger.info(`     Response: ${req.response.status} (cached: ${req.response.fromCache})`);
            }
        });

        // Look for any requests that might contain tweet metadata
        const tweetRequests = networkRequests.filter(req => 
            req.url.includes(tweetId) || 
            req.url.includes('TweetDetail') ||
            req.url.includes('TweetResultByRestId')
        );
        
        logger.info(`\nFound ${tweetRequests.length} tweet-specific requests:`);
        tweetRequests.forEach((req, i) => {
            logger.info(`  ${i + 1}. ${req.method} ${req.url}`);
        });

        // Test: Try to extract the actual author from the page
        const detectedUsername = await page.evaluate(() => {
            const url = window.location.href;
            const match = url.match(/x\.com\/([^\/]+)\/status/);
            return match ? match[1] : null;
        });
        
        logger.info(`Detected username from final URL: ${detectedUsername}`);

        // Test 2: Clear requests and try the generic URL approach
        logger.info("\n=== Testing Generic URL Approach ===");
        networkRequests.length = 0; // Clear the array
        
        const genericStartTime = Date.now();
        await page.goto(`https://x.com/i/status/${tweetId}`, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        const genericEndTime = Date.now();
        logger.info(`Generic URL approach took ${genericEndTime - genericStartTime}ms`);
        
        const finalUrl = page.url();
        logger.info(`Final URL after generic access: ${finalUrl}`);
        
        const genericApiRequests = networkRequests.filter(req => 
            req.url.includes('api') || 
            req.url.includes('graphql') || 
            req.url.includes('1.1') ||
            req.url.includes('2/timeline')
        );
        
        logger.info(`Found ${genericApiRequests.length} API requests with generic approach:`);
        genericApiRequests.forEach((req, i) => {
            logger.info(`  ${i + 1}. ${req.method} ${req.url}`);
        });

        // Check if we can get username from any API response
        const usernameExtraction = await page.evaluate(() => {
            // Try to find username in any visible data
            const profileLinks = Array.from(document.querySelectorAll('a[href*="/"]'))
                .map(link => (link as HTMLAnchorElement).href)
                .filter(href => href.match(/x\.com\/[^\/]+$/));
            
            const currentUrl = window.location.href;
            const urlMatch = currentUrl.match(/x\.com\/([^\/]+)\/status/);
            
            return {
                profileLinks: profileLinks.slice(0, 5), // First 5 profile links
                urlUsername: urlMatch ? urlMatch[1] : null,
                pageTitle: document.title
            };
        });
        
        logger.info("Username extraction results:", usernameExtraction);

    } catch (error) {
        logger.error("Navigation failed:", error);
    }

    // Wait a bit to inspect
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await browser.close();
}

// Main execution
if (import.meta.main) {
    const args = Deno.args;
    const tweetId = args[0] || "1867841781313769674"; // Default test tweet from the project
    
    logger.info(`Analyzing network requests for tweet ID: ${tweetId}`);
    await analyzeNetworkRequests(tweetId);
}