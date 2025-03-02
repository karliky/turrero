import { dirname, join } from "https://deno.land/std/path/mod.ts";
import puppeteer from "puppeteer-core";
import {
    Browser as InstallBrowser,
    BrowserPlatform,
    detectBrowserPlatform,
    install,
    resolveBuildId,
} from "@puppeteer/browsers";
import type { Page } from "puppeteer-core";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

// Types
interface Tweet {
    id: string;
    metadata: TweetMetadata;
    tweet?: string;
}

interface TweetMetadata {
    type?: string;
    img?: string;
    imgs?: Array<{ src: string; alt: string }>;
    url?: string;
    embed?: {
        id: string;
        [key: string]: unknown;
    };
    media?: string;
    description?: string;
    title?: string;
}

// Get current script directory
const __dirname = dirname(new URL(import.meta.url).pathname);

/**
 * Process URLs from known domains to extract metadata
 * @param tweet - The tweet to enrich
 * @param url - The URL to process
 * @param page - Puppeteer page instance for JavaScript-rendered content
 */
async function processKnownDomain(
    tweet: Tweet,
    url: string,
    page: Page,
): Promise<void> {
    if (url.includes("youtube.com")) {
        const response = await fetch(url);
        const data = await response.text();
        const $ = load(data);
        tweet.metadata.media = "youtube";
        tweet.metadata.description = $('meta[name="description"]').attr(
            "content",
        );
        tweet.metadata.title = $('meta[name="title"]').attr("content");
    } else if (
        url.includes("goodreads.com") && !url.includes("user_challenges")
    ) {
        await Promise.all([
            page.goto(url),
            page.waitForNavigation(),
            page.waitForSelector("h1"),
        ]);
        const title = await page.evaluate(() =>
            document.querySelector("h1")?.textContent
        );
        tweet.metadata.media = "goodreads";
        tweet.metadata.title = title || undefined;
    } else if (url.includes("wikipedia.org")) {
        const response = await fetch(url);
        const data = await response.text();
        const $ = load(data);
        tweet.metadata.media = "wikipedia";
        tweet.metadata.title = $("h1").text().trim();
        tweet.metadata.description = Array.from($("div[id=mw-content-text] p"))
            .slice(0, 2)
            .map((el) => $(el).text())
            .join("")
            .trim();
        // Prevent Wikipedia rate limiting
        await new Promise((r) => setTimeout(r, 1000));
    } else if (url.includes("linkedin.com")) {
        const response = await fetch(url);
        const data = await response.text();
        const $ = load(data);
        tweet.metadata.media = "linkedin";
        tweet.metadata.title = $("h1").text().trim();
        tweet.metadata.description = $('meta[name="description"]').attr(
            "content",
        );
    } else {
        console.log("Unknown domain", url);
    }
}

/**
 * Download media from a tweet and process its metadata
 * @param tweet - The tweet containing media to download
 * @param page - Puppeteer page instance
 */
async function downloadTweetMedia(
    tweet: Tweet,
    page: Page,
): Promise<void> {
    if (!tweet.metadata.img) {
        if (tweet.metadata.url) {
            await processKnownDomain(tweet, tweet.metadata.url, page);
            saveTweet(tweet);
        }
        return;
    }

    try {
        // Download image
        const response = await fetch(tweet.metadata.img);
        const imageData = new Uint8Array(await response.arrayBuffer());
        const fileName = `${tweet.id}-${Date.now()}.jpg`;
        await Deno.writeFile(join("./metadata", fileName), imageData);

        if (!tweet.metadata.url) {
            delete tweet.metadata.embed;
            tweet.metadata.img = fileName;
            tweet.metadata.type = "media";
            saveTweet(tweet);
            return;
        }

        // Process URL if exists
        tweet.metadata.img = fileName;
        tweet.tweet = undefined;
        await processKnownDomain(tweet, tweet.metadata.url, page);
        saveTweet(tweet);
    } catch (error) {
        console.error("Failed to download media:", error);
        tweet.metadata.img = undefined;
    }
}

/**
 * Save enriched tweet to the enriched tweets file
 * @param tweet - The enriched tweet to save
 */
function saveTweet(tweet: Tweet): void {
    console.log({ id: tweet.id, ...tweet.metadata });
    delete tweet.metadata.embed;

    // Read existing enriched tweets
    const existingTweetsPath = join(
        __dirname,
        "../infrastructure/db/tweets_enriched.json",
    );
    const existingTweets = JSON.parse(
        Deno.readTextFileSync(existingTweetsPath),
    );

    existingTweets.push({ id: tweet.id, ...tweet.metadata });
    Deno.writeTextFileSync(
        existingTweetsPath,
        JSON.stringify(existingTweets, null, 4),
    );
}

async function main() {
    // Initialize Puppeteer
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
            console.log(
                `Download progress: ${
                    Math.round((downloadedBytes / totalBytes) * 100)
                }%`,
            );
        },
    });

    const browser = await puppeteer.launch({
        headless: true,
        slowMo: 200,
        channel: "chrome",
        executablePath: Deno.env.get("CHROME_PATH"),
    });
    const page = await browser.newPage();

    try {
        // Read tweets library
        const tweetsPath = join(__dirname, "../infrastructure/db/tweets.json");
        const enrichmentsPath = join(
            __dirname,
            "../infrastructure/db/tweets_enriched.json",
        );

        const tweetsLibrary = JSON.parse(Deno.readTextFileSync(tweetsPath));
        const enrichments = JSON.parse(Deno.readTextFileSync(enrichmentsPath));

        // Process each tweet library
        for (const tweetLibrary of tweetsLibrary) {
            for (const tweet of tweetLibrary) {
                if (!tweet.metadata) continue;

                const { embed } = tweet.metadata;

                // Skip if already enriched
                if (
                    enrichments.find((_tweet: Tweet) =>
                        tweet.id === _tweet.id ||
                        (embed && embed.id === _tweet.id)
                    )
                ) {
                    continue;
                }

                // Handle embedded tweets
                if (embed) {
                    const embeddedTweet = {
                        type: "embeddedTweet",
                        embeddedTweetId: embed.id,
                        ...embed,
                        id: tweet.id,
                    };
                    console.log(embeddedTweet);
                    saveTweet(embeddedTweet as Tweet);
                }

                // Process media
                if (!tweet.metadata.type) continue;

                try {
                    if (tweet.metadata.type === "card") {
                        await downloadTweetMedia(tweet, page);
                        continue;
                    }

                    // Process multiple images if present
                    if (tweet.metadata.imgs) {
                        await Promise.all(
                            tweet.metadata.imgs.map(
                                async (
                                    metadata: { src: string; alt: string },
                                ) => {
                                    await downloadTweetMedia(
                                        {
                                            id: tweet.id,
                                            metadata: {
                                                ...metadata,
                                                type: "media",
                                            },
                                        },
                                        page,
                                    );
                                },
                            ),
                        );
                    }
                } catch (error) {
                    console.error(
                        "Request failed",
                        tweet.id,
                        tweet.metadata,
                        error,
                    );
                    tweet.metadata.url = undefined;
                }
            }
        }
    } finally {
        await browser.close();
    }
}

if (import.meta.main) {
    main().catch(console.error);
}
