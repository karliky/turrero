const Tweets = require("./tweets.json");
let i = 0;
console.log("Existing tweets", Tweets.length);
const existingTweets = require("./tweets_summary.json").reduce((acc, tweets) => {
    acc.push(tweets.id);
    return acc;
}, []);

const unprocessedTweets = Tweets.reduce((acc, tweet) => {
    if (existingTweets.find(_id => tweet[0].id === _id)) return acc;
    acc.push(tweet);
    return acc;
}, []);
console.log("unprocessedTweets", unprocessedTweets.length);
unprocessedTweets.forEach((tweets) => {
    console.log(JSON.stringify({
        id: tweets[0].id,
        summary: JSON.stringify(tweets.slice(0, 2).map(({tweet}) => tweet))
    }));
    i++;

    if (i === 10) process.exit(0);
})