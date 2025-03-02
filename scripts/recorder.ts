/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { config as loadDotEnv } from "npm:dotenv";
import { resolve } from "node:path";
import { setupBrowser, setupCleanup, setupPage } from "./libs/browser-setup.ts";
import { getAllTweets } from "./libs/tweet-navigation.ts";
import { CommandLineArgs, TwitterCookies } from "./libs/types.ts";
import { parseArgs } from "node:util";
import process from "node:process";

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
            id: { type: "string", multiple: true },
            test: { type: "boolean", default: false },
        },
        strict: true,
        allowPositionals: false,
    });

    if (!args.values.id || args.values.id.length === 0) {
        console.error("Please provide at least one tweet ID using --id");
        process.exit(1);
    }

    const commandLineArgs: CommandLineArgs = {
        tweetId: args.values.id[0],
        test: args.values.test || false,
    };

    const cookies: TwitterCookies = {
        twid: Deno.env.get("twid"),
        auth_token: Deno.env.get("auth_token"),
        lang: Deno.env.get("lang"),
        d_prefs: Deno.env.get("d_prefs"),
        kdt: Deno.env.get("kdt"),
        ct0: Deno.env.get("ct0"),
        guest_id: Deno.env.get("guest_id"),
    };

    const outputFilePath = "infrastructure/db/tweets.json";
    const browser = await setupBrowser({
        test: commandLineArgs.test,
    });

    const page = await setupPage({
        browser,
        isTest: commandLineArgs.test,
        cookies,
    });

    setupCleanup({ browser, page });

    await getAllTweets({
        page,
        tweetIds: args.values.id,
        outputFilePath,
    });

    await browser.close();
}

main().catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
});
