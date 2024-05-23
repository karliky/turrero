declare module "*.module.css";

interface Turra {
    tweetId: string;
    summary: string;
    categories: string;
    tweets: any[];
    enrichments: any[];
    publishedDate: string;
    urls: string[];
}

interface Tweet {
    tweet: string;
    id: string;
    metadata: {
        embed: {
            type: string;
            id: string;
            author: string;
            tweet: string;
        };
    };
    time: string;
    stats: {
        views: string;
        retweets: string;
        quotetweets: string;
        likes: string;
    };
}

interface TweetSummary {
    id: string;
    summary: string;
}

interface TweetsMap { id: string, categories: string }