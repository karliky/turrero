import puppeteer, { Page } from "puppeteer";
import Tweets from "./../db/tweets_summary.json" with { type: "json" };
import PDFMerger from "pdf-merger-js";
import fs from "node:fs";
import { AUTHORS } from "../infrastructure/constants.js";
import type { TweetSummary } from "../infrastructure/types/index.js";

const PUBLIC = "./public";
const PDFS = "./pdfs";
const merger = new PDFMerger();

(async (): Promise<void> => {
    const browser = await puppeteer.launch({});
    const page: Page = await browser.newPage();
    const tweets: TweetSummary[] = Tweets.sort((a: TweetSummary, b: TweetSummary) => Number(a.id) - Number(b.id));
    
    // recreate the folders everytime
    for await (const dir of [PUBLIC, PDFS]) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    
    for await (const tweet of tweets) {
        console.log(`Saving tweet ${tweet.id} to PDF`);
        // Skip if already exists
        if (fs.existsSync(`${PDFS}/turra-${tweet.id}.pdf`)) {
            merger.add(`${PDFS}/turra-${tweet.id}.pdf`);
            continue;
        }
        // navigate to page
        await page.goto(`http://localhost:3000/turra/${tweet.id}`);
        // wait for the tweet to load
        await page.waitForNetworkIdle();
        // save it to pdf
        await page.pdf({ path: `${PDFS}/turra-${tweet.id}.pdf`, format: "A4" });
        // add to the merger
        merger.add(`${PDFS}/turra-${tweet.id}.pdf`);
    }

    // Set metadata
    await merger.setMetadata({
        producer: "El Turrero Post",
        author: AUTHORS.MAIN,
        creator: "El Turrero Team",
        title: "Todas las turras de El Turrero Post",
    });
    await merger.save(`${PUBLIC}/turras.pdf`);
    console.log(`Turra completa: ${PUBLIC}/turras.pdf`);
    process.exit(0);
})();