export interface TweetMetadata {
    author: string;
    url: string;
    time: string;
}

export interface TweetStats {
    replies: string;
    retweets: string;
    likes: string;
    views: string;
}

export interface CommandLineArgs {
    tweetId: string;
    test: boolean;
}

export interface TwitterCookies {
    twid?: string;
    auth_token?: string;
    lang?: string;
    d_prefs?: string;
    kdt?: string;
    ct0?: string;
    guest_id?: string;
}

// type metadata
export interface MetadataCard {
    type: "card";
    img: string;
    url: string;
}

export interface MetadataEmbed {
    type: "embed";
    id: string;
    author: string;
    tweet: string;
}

export interface MetadataMedia {
    type: "media";
    imgs: {
        img: string;
        url: string;
    }[];
}

export type Metadata = MetadataCard | MetadataEmbed | MetadataMedia;

export interface MyTweet {
    id: string;
    tweet: string;
    author: string;
    time: string;
    url: string;
    stats: TweetStats;
    metadata?: Metadata;
}
