import puppeteer from 'puppeteer';
import Tweets from './../db/tweets_summary.json' assert { type: 'json' };
import PDFMerger from 'pdf-merger-js';
import fs from 'fs';

const PUBLIC = "./public";
const PDFS = "./pdfs";
const merger = new PDFMerger();

(async () => {
    const browser = await puppeteer.launch({})
    const page = await browser.newPage();
    const tweets = Tweets.sort((a, b) => a.id - b.id);
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
        await page.pdf({ path: `${PDFS}/turra-${tweet.id}.pdf`, format: 'A4' });
        // add to the merger
        merger.add(`${PDFS}/turra-${tweet.id}.pdf`);
    }

    // Set metadata
    await merger.setMetadata({
        producer: "El Turrero Post",
        author: "Javier G. Recuenco",
        creator: "El Turrero Team",
        title: "Totas las turras de El Turrero Post"
    });
    await merger.save(`${PUBLIC}/turras.pdf`);
    console.log(`Turra completa: ${PUBLIC}/turras.pdf`);
    process.exit(0);
})();