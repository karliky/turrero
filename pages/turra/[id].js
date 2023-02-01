import Head from "next/head";
import Footer from "../../components/footer";
import TurraHeader from "../../components/turraHeader";
import TwitterThread from "../../components/twitterThread";

const Url = require('node:url');
const Tweets = require("../../db/tweets.json");
const TweetsMap = require("../../db/tweets_map.json");
const TweetsSummary = require("../../db/tweets_summary.json");
const TweetsEnriched = require("../../db/tweets_enriched.json");

export async function getStaticPaths() {
  const paths = Tweets.map((tweet) => ({ params: { id: tweet[0].id } }));
  return { paths, fallback: false };
}

export async function getStaticProps(context) {
  const tweetId = context.params.id;
  const summaryResult = TweetsSummary.find((_tweet => _tweet.id === tweetId)) || "";
  const categoriesResult = TweetsMap.find((_tweet => _tweet.id === tweetId)) || "";
  const thread = Tweets.find(tweet => {
    return tweetId === tweet[0].id;
  }) || [];

  const enrichments = TweetsEnriched.filter((_tweet) => thread.find((thread => thread.id === _tweet.id)));

  const urlsInThread = thread.reduce((acc, { tweet }) => {
    const regexp = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?!&//=]*)/gi;
    const matches = tweet.match(regexp);
    if (matches) matches.forEach((url) => acc.push(url));
    return acc;
  }, []);
  const urlsInEnrichments = enrichments.filter((e) => e.url).map(e => e.url);
  const duplicatedUrls = urlsInThread.filter(url => urlsInEnrichments.find(_url => Url.parse(_url).path === Url.parse(url).path));
  const urls = urlsInThread.filter(url => !duplicatedUrls.find(_url => _url === url));

  const publishedDate = `Publicado el ${new Date(thread[0].time).toLocaleDateString("es-ES")} / ${new Date(thread[0].time).toLocaleTimeString("es-ES")}`;
  return {
    props: {
      tweetId: tweetId,
      summary: summaryResult.summary || "",
      categories: categoriesResult.categories || "",
      tweets: thread,
      enrichments,
      urls,
      publishedDate
    }
  }
}

const Turra = ({ tweetId, summary, categories, tweets, enrichments, publishedDate, urls }) => {
  const title = `${summary} - El Turrero Post - Las turras de Javier G. Recuenco`;
  return (<div>
    <Head>
      <title>{title}</title>
      <meta content="text/html; charset=UTF-8" name="Content-Type" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />

      <meta name="description" content={summary} key="desc" />
      <meta property='og:url' content='https://turrero.vercel.app/'/>
      <meta property="og:title" content="El Turrero Post - Las turras de Javier G. Recuenco" />
      <meta property="og:description" content={summary} />
      <meta property="og:image" content="https://turrero.vercel.app/promo.png"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:site" content="@recuenco"/>
      <meta name="twitter:creator" content="@k4rliky"/>
      <meta name="twitter:title" content="El Turrero Post - Las turras de Javier G. Recuenco"/>
      <meta name="twitter:description" content={summary}/>
      <meta name="twitter:image" content="https://turrero.vercel.app/promo.png"></meta>

    </Head>
    <div>
      <div className="wrapper">
        {TurraHeader({ summary, categories, publishedDate, tweetId, tweets  })}
        {TwitterThread({  tweets, enrichments, urls, summary, categories, tweetId  })}
      </div>
      <Footer />
      <style jsx global>
        {`

        .header h1, .header h2 {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
        }
        .header h1 {
          font-size: 2.3em;
          line-height: 1.2em;
        }
        .header h2 {
          margin-top: 6px;
          line-height: 1.3em;
        }
        .header {
          margin-top: 2em;
          margin-bottom: 2em;
          text-align: left;
          font-size: 1em;
          font-weight: lighter;
        }
        .back {
          font-size: 0.5em;
          font-weight: bold;
          display: flex;
          align-items: center;
          color: #565656;
          text-decoration: none;
          font-size: 1.2em;
          margin-bottom: 10px;
        }

        .wrapper {
          width: 65%;
        }

        .tweet {
          font-size: 1.2rem;
          margin-bottom: 1.125em;
          line-height: 1.5;
          word-break: break-word;
        }

        .flex-container {
          display: flex;
          flex-direction: row;
        }

        .flex-left {
          width: 80ch;
        }

        .flex-right {
          margin-left: 50px;
          top: 15px;
          align-self: flex-start;
        }

        .related {
          display: list-item;
          list-style-type: none;
          margin-left: 31px;
          margin-bottom: 8px;
          line-height: 1.3em;
          word-break: break-word;
        }

        .metadata {
          display: block;
          text-align: center;
        }

        .metadata-section {
          margin-bottom: 6px;
          margin-top: 4px;
          display: flex;
          align-items: center;
        }

        .metadata-section .icon {
          margin-right: 5px;
          width: 24px;
          height: 24px;
        }

        .metadata img {
          max-width: 430px;
          max-height: 205px;
          width: auto;
          height: auto;
          filter: grayscale(100%);
        }

        .metadata img:hover {
          filter: grayscale(0%);
        }

        .metadata .caption {
          display: block;
          font-size: 0.8em;
          font-style: italic;
        }

        .side-block {
          background-color: #F5F5F5;
          padding: 20px;
          padding-left: 25px;
          padding-right: 25px;
          margin-bottom: 10px;
          width: 100%;
          min-width: 35%;
        }

        .categories {
          border-top: 1px solid #d9d9d9;
          padding-top: 6px;
        }

        .category {
          display: inline-block;
          margin-right: 0.5em;
          padding: 0.0714285714em 0.7142857143em 0.1428571429em;
          border-radius: 2px;
          background-color: #78ceef;
          color: #fff;
          padding: 5px 10px 5px 10px;
        }

        .category a {
          color: #fff;
          font-weight: 600;
          text-decoration: none;
        }

        .static-tweet {
          outline: 1px solid #e1e8ed;
          padding: 1.25rem 1.25rem 1.25rem 1.25rem;
          margin-top: 1.25rem;
          border-radius: 5px;
          font-size: 0.9em;
          display: inline-block;
          color: inherit;
          text-decoration: auto;
          width: 100%;
        }

        .static-tweet-text {
          font-size: 0.8em;
          margin-top: 5px;
        }

        .static-tweet-author {
          display: flex;
          align-items: center;
        }

        .static-tweet .icon {
            width: 1.25em;
            height: 1.25em;
            margin-right: 5px;
            background-image: url(data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2072%2072%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h72v72H0z%22%2F%3E%3Cpath%20class%3D%22icon%22%20fill%3D%22%231da1f2%22%20d%3D%22M68.812%2015.14c-2.348%201.04-4.87%201.744-7.52%202.06%202.704-1.62%204.78-4.186%205.757-7.243-2.53%201.5-5.33%202.592-8.314%203.176C56.35%2010.59%2052.948%209%2049.182%209c-7.23%200-13.092%205.86-13.092%2013.093%200%201.026.118%202.02.338%202.98C25.543%2024.527%2015.9%2019.318%209.44%2011.396c-1.125%201.936-1.77%204.184-1.77%206.58%200%204.543%202.312%208.552%205.824%2010.9-2.146-.07-4.165-.658-5.93-1.64-.002.056-.002.11-.002.163%200%206.345%204.513%2011.638%2010.504%2012.84-1.1.298-2.256.457-3.45.457-.845%200-1.666-.078-2.464-.23%201.667%205.2%206.5%208.985%2012.23%209.09-4.482%203.51-10.13%205.605-16.26%205.605-1.055%200-2.096-.06-3.122-.184%205.794%203.717%2012.676%205.882%2020.067%205.882%2024.083%200%2037.25-19.95%2037.25-37.25%200-.565-.013-1.133-.038-1.693%202.558-1.847%204.778-4.15%206.532-6.774z%22%2F%3E%3C%2Fsvg%3E);
        }

        .tweet-not-found {
          text-decoration: dotted;
          text-decoration-line: underline;
          text-decoration-color: #b2b2b2;
          text-underline-offset: 2px;
          font-style: italic;
        }

        .static-tweet:hover {
          outline: 1px solid #ccd6dd;
        }

        .big-url {
          font-size: 1em;
        }

        .sharing {
          display: flex;
          margin-top: 5px;
          justify-content: center;
        }
        .sharing .social-media {
          display: block;
          padding: 10px;
          margin-left: 5px;
          margin-right: 5px;
        }
        .sharing .social-media.twitter {
          background-color: #00acee;
        }
        .sharing .social-media.linkedin {
          background-color: #0077b5;
        }
        .sharing .social-media a img{
          margin-right: 10px;
        }
        .sharing .social-media a {
          display: flex;
          align-items: center;
          color: #fff;
        }
        h2 a {
          margin-left: 5px;
        }
        @media (max-width: 1300px) {
          .wrapper {
              width: 90%;
          }
        }

        @media (max-width: 1024px) {
          .wrapper {
              width: 90%;
          }

          .flex-container {
              flex-direction: column;
          }

          .flex-left {
              width: 100%;
          }

          .flex-right {
              width: 100%;
              margin-left: 0;
              position: relative;
          }
          
          .metadata img {
            max-width: 280px;
            max-height: 120px;
          }

          .footer {
              padding: 5px;
          }

          .side-block {
              max-width: inherit;
              min-width: initial;
          }
          .category {
            margin-top: 5.5px;
        }

        .small {
          font-size: 0.6em;
        }
      `}
      </style>
    </div>
  </div>);
}

export default Turra;
