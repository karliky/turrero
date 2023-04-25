import Sidebar from "./sidebar";
import RenderTweet from "./renderTweet";
import styles from './turra.module.css';

export default function ({ tweets, enrichments, urls, summary, categories, tweetId }) {
    const books = enrichments.filter((tweet) => tweet.media === "goodreads");
    const videos = enrichments.filter((tweet) => tweet.media === "youtube");
    const linkedin = enrichments.filter((tweet) => tweet.media === "linkedin");
    const wikipedia = enrichments.filter((tweet) => tweet.media === "wikipedia");
    const replaceURLWithHTMLLinks = (text) => {
        var exp = /(\b(https?|ftp|file):\/\/([-A-Z0-9+&@#%?=~_|!:,.;]*)([-A-Z0-9+&@#%?\/=~_|!:,.;]*)[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(exp, "<a href='$1' target='_blank'>$1</a>");
    }
    return <div className={styles.flexContainer}>
        <div className={styles.flexLeft}>{tweets.map(({ tweet, id, metadata: embeddedTweet }) => {
            const metadata = enrichments.find(_tweet => id === _tweet.id);
            let tweetText = replaceURLWithHTMLLinks(tweet);
            tweetText = tweetText.replace(/#(\S*)/g, '<a target="_blank" href="https://twitter.com/search?q=%23$1&src=typed_query">#$1</a>');
            tweetText = tweetText.replace(/@(\S*)/g, '<a target="_blank" href="http://twitter.com/$1">@$1</a>');
            const embed = embeddedTweet ? embeddedTweet.embed : undefined;
            return RenderTweet({ id, tweetText, metadata, embed });
        })}</div>
        {Sidebar({ books, videos, linkedin, urls, wikipedia, summary, categories, tweetId })}
    </div>;
}