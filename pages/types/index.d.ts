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

interface Embed {
    type: string;
    id: string;
    author: string;
    tweet: string;
}


interface Stats {
    views: string;
    retweets: string;
    quotetweets: string;
    likes: string;
}

interface Tweet {
    tweet: string;
    id: string;
    metadata: {
        embed: Embed;
    };
    time: string;
    stats: Stats;
}