import Head from "next/head";
import Footer from "../../components/footer";
import TurraHeader from "../../components/turraHeader";
import TwitterThread from "../../components/twitterThread";
import styles from '../../components/turra.module.css';

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
      <div className={`wrapper ${styles.wrapper}`}>
        {TurraHeader({ summary, categories, publishedDate, tweetId, tweets  })}
        {TwitterThread({  tweets, enrichments, urls, summary, categories, tweetId  })}
      </div>
      <Footer />
    </div>
  </div>);
}

export default Turra;
