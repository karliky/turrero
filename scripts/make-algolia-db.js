/**
 * With this script, we create a new file that contains all the tweets in a single array (flatting the threads)
 * and then we can manually upload it to Algolia.
 */
const fs = require("fs");
const tweets = require(__dirname + "/../db/tweets.json");

const algoliaTweets = [];

tweets.forEach((thread) => {
    const tweetId = thread[0].id;
    thread.forEach(({ id, tweet }) => algoliaTweets.push({ id: tweetId + "-" + id, tweet: tweet, time: thread[0].time }));
});

fs.writeFileSync("../db/tweets-db.json", JSON.stringify(algoliaTweets));