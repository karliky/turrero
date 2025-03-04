/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { config as loadDotEnv } from "npm:dotenv";
import { resolve } from "node:path";
import { Rettiwt, Tweet, TweetMedia } from "npm:rettiwt-api";
import { CommandLineArgs, MyTweet } from "./libs/types.ts";
import { parseArgs } from "node:util";
import process, { exit } from "node:process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import puppeteer from "puppeteer";
import { encodeCookies, env2cookies } from "./libs/cookie-handler.ts";
import { cardMediaDownload } from "./libs/fetcherTools.ts";

// Load environment variables from .env file
const envResult = loadDotEnv({ path: resolve(process.cwd(), ".env") });

if (envResult.error) {
    console.warn("Warning: Error loading .env file:", envResult.error.message);
}

async function main() {
    // Verify required environment variables
    const requiredEnvVars = ["twid", "auth_token", "ct0"];
    const missingVars = requiredEnvVars.filter((varName) =>
        !Deno.env.get(varName)
    );

    if (missingVars.length > 0) {
        console.error(
            "Error: Missing required environment variables for twitter cookies:",
            missingVars.join(", "),
        );
        console.error(
            "Please ensure these variables are set in your .env file",
        );
        process.exit(1);
    }

    const args = parseArgs({
        options: {
            id: { type: "string" },
            test: { type: "boolean", default: false },
        },
        strict: true,
        allowPositionals: false,
    });

    if (!args.values.id) {
        console.error("Please provide the ID OF THE LAST TWEET, using --id");
        process.exit(1);
    }

    const commandLineArgs: CommandLineArgs = {
        tweetId: args.values.id,
        test: args.values.test || false,
    };

    const cookies = env2cookies(Deno.env);
    const outputFilePath = "infrastructure/db/tweets.json";

    // Create API key from encoded cookies
    const apiKey = encodeCookies(cookies);
    const rettiwt: Rettiwt = new Rettiwt({ apiKey: apiKey });

    try {
        // Ensure output directory exists
        const dir = dirname(outputFilePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Initialize or load tweets file
        const existingTweets: MyTweet[][] = existsSync(outputFilePath)
            ? JSON.parse(readFileSync(outputFilePath, "utf-8"))
            : [];

        // Fetching the details of the given user
        const tweets: Tweet[] = [];
        let currentTweetId: string | undefined = commandLineArgs.tweetId;
        const browser = await puppeteer.launch();

        while (currentTweetId) {
            const tweet: Tweet | undefined = await rettiwt.tweet.details(
                currentTweetId,
            )
                .catch((err) => {
                    console.log(
                        "crashed at " + "https://x.com/111111/status/" +
                            currentTweetId,
                    );
                    console.error("Error fetching tweet:", err);
                    process.exit(1);
                    return undefined;
                });

            if (!tweet) {
                break;
            }

            tweets.push(tweet);
            currentTweetId = tweet.replyTo || undefined;
        }

        console.log(`Tweet thread (${tweets.length} tweets)`);
        const tweetTexts: MyTweet[] = await Promise.all(
            tweets.reverse().map(async (tweet) =>
                await transformTweet(browser, tweet)
            ),
        );
        await browser.close();

        // Save all tweets
        if (tweetTexts.length > 0) {
            existingTweets.push(tweetTexts);
            writeFileSync(
                outputFilePath,
                JSON.stringify(existingTweets, null, 4),
            );
            console.log(
                `Successfully saved ${tweets.length} tweets to ${outputFilePath}`,
            );
        }
    } catch (error) {
        console.error("Error fetching thread:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
});

async function transformTweet(
    browser: puppeteer.Browser,
    tweet: Tweet,
): Promise<MyTweet> {
    const uid = tweet.tweetBy.userName;
    const myTweet: MyTweet = {
        id: tweet.id,
        tweet: tweet.fullText,
        author: `https://x.com/${uid}`,
        time: new Date(tweet.createdAt).toISOString(),
        url: `https://x.com/${uid}/status/${tweet.id}`,
        stats: {
            replies: tweet.replyCount.toString(),
            retweets: tweet.retweetCount.toString(),
            likes: tweet.likeCount.toString(),
            views: tweet.viewCount.toString(),
        },
    };

    if (tweet.media) {
        myTweet.metadata = {
            type: "media",
            imgs: tweet.media.map((media: TweetMedia) => {
                return {
                    img: media.thumbnailUrl || "",
                    url: media.url,
                };
            }),
        };
    }
    if (tweet.retweetedTweet) {
        myTweet.metadata = {
            type: "embed",
            id: tweet.retweetedTweet.id,
            author: tweet.retweetedTweet.tweetBy.userName,
            tweet: tweet.retweetedTweet.fullText,
        };
    }

    if (tweet.entities?.urls && tweet.entities?.urls.length > 0) {
        // open the URL and get the image with puppeteer
        try {
            const resourceUrl = tweet.entities.urls[0];
            const webURL = myTweet.url;
            const card = await cardMediaDownload(
                browser,
                resourceUrl,
                webURL,
            );
            myTweet.metadata = card;
        } catch {
            // Silently fail if there are any errors
        }
    }
    return myTweet;
}
