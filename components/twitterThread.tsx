import React from 'react';
import Sidebar from "./sidebar";
import RenderTweet from "./renderTweet";
import styles from './turra.module.css';

interface Props {
    tweets: { tweet: string, id: string, metadata: { embed?: string } }[];
    enrichments: { id: string, media: string }[];
    urls: string[];
    summary: string;
    categories: string;
    tweetId: string;
    printMode?: boolean;
}

const replaceURLWithHTMLLinks = (text: string): string => {
    const exp = /(\b(https?|ftp|file):\/\/([-A-Z0-9+&@#%?=~_|!:,.;]*)([-A-Z0-9+&@#%?\/=~_|!:,.;]*)[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp, "<a href='$1' target='_blank'>$1</a>");
}

const TweetComponent: React.FC<Props> = ({ tweets, enrichments, urls, summary, categories, tweetId, printMode = false }) => {
    const books = enrichments.filter((tweet) => tweet.media === "goodreads");
    const videos = enrichments.filter((tweet) => tweet.media === "youtube");
    const linkedin = enrichments.filter((tweet) => tweet.media === "linkedin");
    const wikipedia = enrichments.filter((tweet) => tweet.media === "wikipedia");
    return (
        <div className={styles.flexContainer}>
            <div className={styles.flexLeft}>
                {tweets.map(({ tweet, id, metadata: embeddedTweet }) => {
                    if (id === "1653834693081440288") {
                        console.log("tweet", tweet);
                    }
                    const metadata = enrichments.find(_tweet => id === _tweet.id);
                    let tweetText = replaceURLWithHTMLLinks(tweet);
                    // Cambia los hashtags por links, only alphanumeric characters
                    tweetText = tweetText.replace(/#(\w*)/g, '<a target="_blank" href="https://twitter.com/search?q=%23$1&src=typed_query">#$1</a>');
                    // Menciones a usuarios (había un bug con una coma al final)
                    tweetText = tweetText.replace(/@(\w+)/g, '<a target="_blank" href="https://twitter.com/$1">@$1</a>');
                    const embed = embeddedTweet ? embeddedTweet.embed : undefined;
                    return <RenderTweet key={id} id={id} tweetText={tweetText} metadata={metadata} embed={embed} />;
                })}
            </div>
            {!printMode && <Sidebar books={books} videos={videos} linkedin={linkedin} urls={urls} wikipedia={wikipedia} summary={summary} categories={categories} tweetId={tweetId} />}
        </div>
    );
}

export default TweetComponent;
