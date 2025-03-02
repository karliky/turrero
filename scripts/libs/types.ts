import type { Browser, Page } from "puppeteer-core";

export interface TweetMetadata {
    author: string;
    url: string;
    time: string;
}

export interface TweetStats {
    replies: number;
    retweets: number;
    likes: number;
    views: number;
}

export interface Tweet extends TweetMetadata {
    text: string;
    stats: TweetStats;
}

export interface CommandLineArgs {
    tweetId: string;
    test: boolean;
}

export interface TweetNavigationConfig {
    page: Page;
    author?: string;
    tweetIds: string[];
    outputFilePath: string;
}

export interface BrowserConfig {
    executablePath: string;
    test?: boolean;
}

export interface CleanupConfig {
    browser: Browser;
    page: Page;
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

export interface PageConfig {
    browser: Browser;
    isTest: boolean;
    cookies: TwitterCookies;
}
