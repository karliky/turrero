import puppeteer from 'puppeteer';
import Tweets from './../db/tweets_summary.json' assert { type: 'json' };
import PDFMerger from 'pdf-merger-js';
import fs from 'fs';

const merger = new PDFMerger();

(async () => {
    const browser = await puppeteer.launch({})
    const page = await browser.newPage();
    const tweets = Tweets.sort((a, b) => a.id - b.id);
    for await (const tweet of tweets) {
        console.log(`Saving tweet ${tweet.id} to PDF`);
        // Skip if already exists
        if (fs.existsSync(`./pdfs/turra-${tweet.id}.pdf`)) {
            merger.add(`./pdfs/turra-${tweet.id}.pdf`);
            continue;
        }
        // navigate to page
        await page.goto(`http://localhost:3000/turra/${tweet.id}`);
        // wait for the tweet to load
        await page.waitForNetworkIdle();
        // save it to pdf
        await page.pdf({ path: `./pdfs/turra-${tweet.id}.pdf`, format: 'A4' });
        // add to the merger
        merger.add(`./pdfs/turra-${tweet.id}.pdf`);
    }

    // Set metadata
    await merger.setMetadata({
        producer: "El Turrero Post",
        author: "Javier G. Recuenco",
        creator: "Karliky",
        title: "Totas las turras de El Turrero Post"
    });

    await merger.save('./../public/turras.pdf');
    process.exit(0);
})();