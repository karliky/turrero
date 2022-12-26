// NODE_TLS_REJECT_UNAUTHORIZED=0
const tweetsLibrary = require("./tweets.json");
const fs = require("fs");
const Downloader = require("nodejs-file-downloader");
const { tall } = require('tall');

fs.rmSync("./metadata", { recursive: true, force: true });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

(async () => {
    for (const tweetLibrary of tweetsLibrary) {
        for (const tweet of tweetLibrary) {
            if (!tweet.metadata) continue;
            const { metadata } = tweet;
            const downloader = new Downloader({
                url: metadata.img,
                directory: "./metadata",
              });
            try {
                const { filePath } = await downloader.download();
                const url = await tall(metadata.url);
                tweet.metadata.img = filePath;
                tweet.metadata.url = url;
                console.log(tweet.metadata);
            } catch (error) {
                console.log("Request failed", tweet.metadata, error);
                tweet.metadata.url = undefined;
            }
        }
    }
    fs.writeFileSync("./tweets_enriched.json", JSON.stringify(tweetsLibrary));
})()