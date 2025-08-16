/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import puppeteer from "puppeteer-core";
import { dirname, join } from "@std/path";
import { createDenoLogger } from "../infrastructure/logger.ts";

const logger = createDenoLogger("debug-auth");
const __dirname = dirname(new URL(import.meta.url).pathname);

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

async function debugAuth() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50,
        channel: "chrome",
    });

    const page = await browser.newPage();
    
    // Load cookies
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
            
        logger.info(`Loaded ${cookies.length} cookies`);
        console.log("Cookies:", cookies.map(c => ({ name: c.name, value: c.value.slice(0, 10) + "..." })));
        
        await page.setCookie(...cookies);
    } catch (error) {
        logger.error("Could not load cookies:", error);
    }

    await page.emulate(iPhone12);

    // Test authentication by going to home page first
    logger.info("Testing authentication by going to X.com home page...");
    
    try {
        await page.goto('https://x.com', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                hasLoginButton: !!document.querySelector('a[href="/login"]'),
                hasSignupButton: !!document.querySelector('a[href*="signup"]'),
                isLoggedIn: !window.location.href.includes('/login') && !document.querySelector('a[href="/login"]'),
                bodyClasses: document.body.className,
                hasHomeTimeline: !!document.querySelector('[data-testid="primaryColumn"]')
            };
        });
        
        logger.info("Page info:", pageInfo);
        
        if (pageInfo.isLoggedIn) {
            logger.info("✅ Authentication successful! Testing tweet access...");
            
            // Now try to access a specific tweet
            const tweetId = "1867841781313769674";
            await page.goto(`https://x.com/i/status/${tweetId}`, {
                waitUntil: 'networkidle0', 
                timeout: 15000
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const tweetInfo = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasTweetText: !!document.querySelector('[data-testid="tweetText"]'),
                    hasArticle: !!document.querySelector('article[data-testid="tweet"]'),
                    errorMessage: document.querySelector('[data-testid="error-detail"]')?.textContent,
                    pageContent: document.body.textContent?.slice(0, 200)
                };
            });
            
            logger.info("Tweet access info:", tweetInfo);
            
            if (tweetInfo.hasTweetText) {
                logger.info("✅ Tweet access successful!");
                
                // Try to extract username
                const username = await page.evaluate(() => {
                    const authorLink = document.querySelector('[data-testid="User-Name"] a[role="link"]');
                    if (authorLink) {
                        const href = (authorLink as HTMLAnchorElement).href;
                        const match = href.match(/x\.com\/([^\/\?]+)/);
                        return match ? match[1] : null;
                    }
                    return null;
                });
                
                logger.info("Detected username:", username);
            } else {
                logger.error("❌ Could not access tweet content");
            }
        } else {
            logger.error("❌ Authentication failed - not logged in");
        }
        
    } catch (error) {
        logger.error("Navigation error:", error);
    }

    // Wait for inspection
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await browser.close();
}

if (import.meta.main) {
    await debugAuth();
}