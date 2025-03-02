import type { Browser, Dialog, HTTPRequest, Page } from "puppeteer-core";
import { BrowserConfig, CleanupConfig, PageConfig } from "./types.ts";
import puppeteer from "puppeteer";

// Device Configuration
const iPhone12 = {
    name: "iPhone 12",
    userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
    viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false,
    },
};

export async function setupBrowser(config: BrowserConfig): Promise<Browser> {
    const browserProps = config.test
        ? {
            headless: false, // GUI mode for testing
            slowMo: 50,
        }
        : {
            headless: "new",
            slowMo: Math.floor(Math.random() * 150) + 750,
        };

    console.log(
        browserProps.headless
            ? "Launching in headless mode..."
            : "Launching browser with GUI...",
    );

    const launchOptions = {
        ...browserProps,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-site-isolation-trials",
            "--disable-blink-features=AutomationControlled",
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: null,
        protocolTimeout: 30000,
    };

    return await puppeteer.launch(
        launchOptions as Parameters<typeof puppeteer.launch>[0],
    ) as unknown as Browser;
}

export async function setupPage(config: PageConfig): Promise<Page> {
    const page = await config.browser.newPage();

    // Set default navigation timeout
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    // Enable request interception
    await page.setRequestInterception(true);
    page.on("request", (request: HTTPRequest) => {
        if (
            request.isNavigationRequest() && request.redirectChain().length > 5
        ) {
            request.abort();
        } else {
            request.continue();
        }
    });

    if (config.isTest) {
        console.log("COOKIES Configuration:");
        console.log(config.cookies);
    }

    // Set cookies
    const cookies = [
        {
            name: "twid",
            value: config.cookies.twid || "",
            domain: ".x.com",
            path: "/",
        },
        {
            name: "auth_token",
            value: config.cookies.auth_token || "",
            domain: ".x.com",
            path: "/",
        },
        {
            name: "lang",
            value: config.cookies.lang || "",
            domain: ".x.com",
            path: "/",
        },
        {
            name: "d_prefs",
            value: config.cookies.d_prefs || "",
            domain: ".x.com",
            path: "/",
        },
        {
            name: "kdt",
            value: config.cookies.kdt || "",
            domain: ".x.com",
            path: "/",
        },
        {
            name: "ct0",
            value: config.cookies.ct0 || "",
            domain: ".x.com",
            path: "/",
        },
        {
            name: "guest_id",
            value: config.cookies.guest_id || "",
            domain: ".x.com",
            path: "/",
        },
        {
            name: "domain",
            value: "https://x.com/",
            domain: ".x.com",
            path: "/",
        },
    ];

    console.log("Setting cookies");
    await page.setCookie(...cookies);

    // Set user agent and viewport
    await page.emulate(iPhone12);

    // Disable JavaScript dialog handling (alerts, confirms, prompts)
    page.on("dialog", async (dialog: Dialog) => {
        await dialog.dismiss();
    });

    // Add additional headers
    await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "User-Agent": iPhone12.userAgent,
    });

    return page;
}

export async function setupCleanup(config: CleanupConfig): Promise<void> {
    async function cleanup() {
        try {
            if (config.page) {
                console.log("\nClosing page...");
                await config.page.close().catch(() => {}); // Ignore errors if page is already closed
            }
            if (config.browser) {
                console.log("Closing browser...");
                await config.browser.close().catch(() => {}); // Ignore errors if browser is already closed
            }
        } catch (error) {
            console.error("Error during cleanup:", error);
        } finally {
            process.exit(0);
        }
    }

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
}
