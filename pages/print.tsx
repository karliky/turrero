import React from 'react';
import Head from "next/head";
import TurraHeader from "../components/turraHeader";
import TwitterThread from "../components/twitterThread";
import styles from '../components/turra.module.css';
import Url from "url";

const Tweets: Tweet[][] = require("../db/tweets.json");
const TweetsMap: TweetsMap[] = require("../db/tweets_map.json");
const TweetsSummary: TweetSummary[] = require("../db/tweets_summary.json");
const TweetsEnriched: any = require("../db/tweets_enriched.json");


export function NewPage(): JSX.Element {
  return <div className={styles.footer}></div>;
}

function genProps(tweetId: string): Turra {
  const summaryResult: string = TweetsSummary.find((_tweet: any) => _tweet.id === tweetId)?.summary || "";
  const categoriesResult: string = TweetsMap.find((_tweet: any) => _tweet.id === tweetId)?.categories || "";
  const thread = Tweets.find((tweet: Tweet[]) => {
    return tweetId === tweet[0].id;
  }) || [];

  const enrichments = TweetsEnriched.filter((_tweet: any) => thread.find((thread: any) => thread.id === _tweet.id));

  const urlsInThread = thread.reduce((acc: any[], { tweet }: any) => {
    const regexp = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?!&//=]*)/gi;
    const matches = tweet.match(regexp);
    if (matches) matches.forEach((url: string) => acc.push(url));
    return acc;
  }, []);

  const urlsInEnrichments = enrichments.filter((e: any) => e.url).map((e: any) => e.url);
  const duplicatedUrls = urlsInThread.filter((url: string) => urlsInEnrichments.find((_url: string) => Url.parse(_url).path === Url.parse(url).path));
  const urls = urlsInThread.filter((url: string) => !duplicatedUrls.find((_url: string) => _url === url));

  let publishedDate = "";
  if (thread[0] && thread[0].time) {
    publishedDate = `Publicado el ${new Date(thread[0].time).toLocaleDateString("es-ES")} / ${new Date(thread[0].time).toLocaleTimeString("es-ES")}`;
  }

  return {
    tweetId: tweetId,
    summary: summaryResult,
    categories: categoriesResult,
    tweets: thread,
    enrichments,
    urls,
    publishedDate
  }
}


const Turra: React.FC<Turra> = ({ tweetId, summary, categories, tweets, enrichments, publishedDate, urls }) => {
  const printMode = true;
  return (
    <div>
      <div className={`wrapper ${styles.wrapper}`
      }>
        {TurraHeader({ summary, categories, publishedDate, tweetId, tweets, printMode })}
        {TwitterThread({ tweets, enrichments, urls, summary, categories, tweetId, printMode })}
      </div>
    </div>
  );
}

const TableOfContents: React.FC<{ turras: Turra[] }> = ({ turras }) => {
  return (
    <div className='flexContainer'>
      <h1 className='header'>Índice</h1>
      <ul>
        {turras.map((turra) => (
          <li key={turra.tweetId}>
            <a href
              ={"#" + turra.tweetId}>{turra.summary}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}


const Turras: React.FC = () => {
  const title = "Recopilación de las turras de Javier G. Recuenco";
  const turras: Turra[] = Tweets.map((tweets) => genProps(tweets[0].id));
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta content="text/html; charset=UTF-8" name="Content-Type" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />

        <meta property='og:url' content='https://turrero.vercel.app/print' />
        <meta property="og:title" content="Libros - Las turras de Javier G. Recuenco" />

        <meta property="og:image" content="https://turrero.vercel.app/promo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@recuenco" />
        <meta name="twitter:creator" content="@k4rliky" />
        <meta name="twitter:title" content="Las turras de Javier G. Recuenco - Recopilación" />
        <meta name="twitter:image" content="https://turrero.vercel.app/promo.png"></meta>
      </Head>
      <TableOfContents turras={turras} />
      <div>
        {
          turras.map((turra) => (
            <div id={turra.tweetId} key={turra.tweetId}>
              <Turra
                key={"turra-" + turra.tweetId}
                tweetId={turra.tweetId}
                summary={turra.summary}
                categories={turra.categories}
                tweets={turra.tweets}
                enrichments={turra.enrichments}
                publishedDate={turra.publishedDate}
                urls={turra.urls}
              /></div>)
          )
        }
        <NewPage />
      </div>
    </>
  );
}

export default Turras;