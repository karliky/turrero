import React from 'react';
import Head from "next/head";
import TurraHeader from "../components/turraHeader";
import TwitterThread from "../components/twitterThread";
import styles from '../components/turra.module.css';
import Url from "url";

const Tweets: Tweet[][] = require("../db/tweets.json");
const TweetsMap: any = require("../db/tweets_map.json");
const TweetsSummary: any = require("../db/tweets_summary.json");
const TweetsEnriched: any = require("../db/tweets_enriched.json");


export function NewPage(): JSX.Element {
  return <div className={styles.footer}></div>;
}

function genProps(tweetId: string): Turra {
  const summaryResult = TweetsSummary.find((_tweet: any) => _tweet.id === tweetId) || "";
  const categoriesResult = TweetsMap.find((_tweet: any) => _tweet.id === tweetId) || "";
  const thread = Tweets.find((tweet: any) => {
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
    summary: summaryResult.summary || "",
    categories: categoriesResult.categories || "",
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
        {TurraHeader({ summary, categories, publishedDate, tweetId, tweets })}
        {TwitterThread({ tweets, enrichments, urls, summary, categories, tweetId, printMode })}
      </div>
    </div>
  );
}



const Turras: React.FC = () => {
  const title = `El Turrero Post - Las turras de Javier G. Recuenco`;
  return (
    <>
      <Head>
        <title>{title} </title>
        < meta content="text/html; charset=UTF-8" name="Content-Type" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div>
        {
          Tweets.map((tweets: any) => {
            const t0 = tweets[0];
            const turra: Turra = genProps(t0.id);
            return (
              <div key={turra.tweetId} >
                <Turra
                  tweetId={turra.tweetId}
                  summary={turra.summary}
                  categories={turra.categories}
                  tweets={turra.tweets}
                  enrichments={turra.enrichments}
                  publishedDate={turra.publishedDate}
                  urls={turra.urls}
                  sharing={false}
                />
              </div>
            );
          })
        }
        <NewPage />
      </div>
    </>
  );
}

export default Turras;