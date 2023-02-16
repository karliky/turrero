import Head from "next/head";
import Footer from "../components/footer";
import Header from "../components/header";
import Search from "../components/search";

import TweetsMap from "../db/tweets_map.json";
import Tweets from "../db/tweets.json";
import TweetsPodcasts from "../db/tweets_podcast.json";
import TweetsSummary from "../db/tweets_summary.json";

export default function Turrero() {
  const blockOrder = {
    "resolución-de-problemas-complejos": [],
    "sistemas-complejos": [],
    "marketing": [],
    "estrategia": [],
    "factor-x": [],
    "sociología": [],
    "gestión-del-talento": [],
    "leyes-y-sesgos": [],
    "trabajo-en-equipo": [],
    "libros": [],
    "futurismo-de-frontera": [],
    "personotecnia": [],
    "orquestación-cognitiva": [],
    "gaming": [],
    "lectura-de-señales": [],
    "el-contexto-manda": [],
    "desarrollo-de-habilidades": [],
    "otras-turras-del-querer": [],
  };

  function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "a";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "m";
    interval = Math.floor(seconds / 604800);
    if (interval >= 1) return interval + "s";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h";
    return "h";
  }

  const categorizedTweets = () => {
    const categories = blockOrder;
    TweetsMap.forEach((tweet) => {
      const categoriesForTweet = tweet.categories.split(",");
      categoriesForTweet.forEach((category) => {
        categories[category].push(TweetsSummary.find((_tweet => _tweet.id === tweet.id)));
      });
    });
    return categories;
  }

  const unThousand = (n) => (n.replace("K", "")) * 1000

  const getSimpleStats = (stats) => {
    return Object.keys(stats).reduce((acc, key) => {
      if (key === "views") return acc;
      const value = stats[key];
      if (value.includes("K")) {
        const num = unThousand(stats[key]);
        acc += num;
        return acc;
      }
      acc += parseInt(stats[key], 10);
      return acc;
    }, 0);
  }

  const findTopTweets = () => {
    const top = Tweets.sort(function (a, b) {
      const statsa = getSimpleStats(a[0].stats);
      const statsb = getSimpleStats(b[0].stats);
      return statsb - statsa;
    });
    return top.slice(0, 25).map((tweet) => {
      return TweetsSummary.find((_tweet => _tweet.id === tweet[0].id))
    });
  }

  const findTopViews = () => {
    const top = Tweets
      .filter((tweets) => !!tweets[0].stats.views)
      .sort(function (a, b) {
        if (!a[0].stats.views) return 0;
        const statsa = unThousand(a[0].stats.views);
        const statsb = unThousand(b[0].stats.views);
        return statsb - statsa;
      });
    return top.slice(0, 25).map((tweet) => {
      return TweetsSummary.find((_tweet => _tweet.id === tweet[0].id))
    });
  }

  const formatTitle = (title) => title.charAt(0).toUpperCase() + title.slice(1)

  const tweets = categorizedTweets();
  const top25 = findTopTweets();
  const mostViews = findTopViews();

  function orderByDate() {
    return (a, b) => new Date(b.time) - new Date(a.time);
  }

  return (<div>
    <Head>
      <title>El Turrero Post - Las turras de Javier G. Recuenco</title>
      <meta content="text/html; charset=UTF-8" name="Content-Type" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />

      <meta name="description" content="El Turrero Post es la colección curada y ordenada de las publicaciones de Javier. G. Recuenco sobre las ciencias de la complejidad, CPS, Factor-X, etc..." key="desc" />
      <meta property='og:url' content='https://turrero.vercel.app/'/>
      <meta property="og:title" content="El Turrero Post - Las turras de Javier G. Recuenco" />
      <meta property="og:description" content="El Turrero Post es la colección curada y ordenada de las publicaciones de Javier. G. Recuenco sobre las ciencias de la complejidad, CPS, Factor-X, etc..." />
      <meta property="og:image" content="https://turrero.vercel.app/promo.png"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:site" content="@recuenco"/>
      <meta name="twitter:creator" content="@k4rliky"/>
      <meta name="twitter:title" content="El Turrero Post - Las turras de Javier G. Recuenco"/>
      <meta name="twitter:description" content="El Turrero Post es la colección curada y ordenada de las publicaciones de Javier. G. Recuenco sobre las ciencias de la complejidad, CPS, Factor-X, etc..."/>
      <meta name="twitter:image" content="https://turrero.vercel.app/promo.png"></meta>
    </Head>
    <div className="wrapper">
      <Header children={Search} totalTweets={Tweets.length} />
      <div className="columns">
        <div className="column">
          <div className="spacing">
            <div className="heading">
              <div className="title tooltip" title="Ordenador por mayor impacto: (retweet + quotetweet + likes) ">Top 25 turras</div>
            </div>
            <div className="links">
              {top25.map((tweet) => {
                const timeAgo = Tweets.find(_tweet => _tweet[0].id === tweet.id);
                const hasAudio = TweetsPodcasts.find(_tweet => _tweet.id === tweet.id);
                return <div className="link" key={tweet.id + "id-top"}>
                  <div>
                    <div className="time" title={`Publicado el ${new Date(timeAgo[0].time).toLocaleDateString("es-ES")} / ${new Date(timeAgo[0].time).toLocaleTimeString("es-ES")}`}>{timeSince(new Date(timeAgo[0].time).getTime())}</div>
                  </div>
                  <div className="flex">
                    {hasAudio && 
                    <a href={"/turra/" + tweet.id + (hasAudio ? "#podcast" : "")}>
                      <img className="icon-audio" src="/volume-2.svg" alt="Esta turra está disponible en formato podcast" title="Esta turra está disponible en formato podcast" />
                    </a>}
                    <a href={"/turra/" + tweet.id} className="flex">{tweet.summary}</a>
                  </div>
                </div>
              }
              )}
            </div>
          </div>
        </div>
        {Object.keys(tweets).map((key) => {
          return <div className="column" key={key + "-category"}>
            <div className="spacing">
              <div className="heading">
                <div className="title" id={key.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}>{formatTitle(key.replaceAll("-", " "))}</div>
              </div>
              <div className="links">
                {tweets[key].map(tweet => ({ 
                  time: Tweets.find(_tweet => _tweet[0].id === tweet.id)[0].time, 
                  ...tweet 
                })).sort(orderByDate()).map((tweet) => {
                  return <div className="link" key={tweet.id + "-" + key + "id"}>
                    <div>
                      <div className="time" title={`Publicado el ${new Date(tweet.time).toLocaleDateString("es-ES")} / ${new Date(tweet.time).toLocaleTimeString("es-ES")}`}>{timeSince(new Date(tweet.time).getTime())}</div>
                    </div>
                    <div>
                      <a href={"/turra/" + tweet.id}>{tweet.summary}</a>
                    </div>
                  </div>
                }
                )}
              </div>
            </div>
          </div>
        })}
        <div className="column">
          <div className="spacing">
            <div className="heading">
              <div className="title">Las más leídas</div>
            </div>
            <div className="links">
              {mostViews.map((tweet) => {
                const timeAgo = Tweets.find(_tweet => _tweet[0].id === tweet.id);
                return <div className="link" key={tweet.id + "most-read"}>
                  <div>
                    <div className="time" title={`Publicado el ${new Date(timeAgo[0].time).toLocaleDateString("es-ES")} / ${new Date(timeAgo[0].time).toLocaleTimeString("es-ES")}`}>{timeSince(new Date(timeAgo[0].time).getTime())}</div>
                  </div>
                  <div>
                    <a href={"/turra/" + tweet.id}>{tweet.summary}</a>
                  </div>
                </div>
              }
              )}
            </div>
          </div>
        </div>
      </div>
      {Footer()}
    </div>
    <style jsx global>
      {`
      .spacing {
        padding: 6px;
      }
      .tooltip {
        text-decoration: dotted;
        text-decoration-line: underline;
        text-decoration-color: #b2b2b2;
        text-underline-offset: 2px;
        cursor: default;
      }

      .small {
        font-size: 10px;
      }

      .flex {
        display: flex;
      }

      .icon-audio {
        width: 16px;
        height: 16px;
        margin-right: 8px;
      }

      .columns {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 40px;
      }

      .columns .column .heading .title {
        display: inline-block;
        padding: 4px;
        padding-left: 0;
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
        color: #231f20;
        text-transform: uppercase;
      }

      .columns .column .heading img {
        width: 50px;
      }

      .columns .column .links {
        height: 40vh;
        border-top: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
        overflow: auto;
      }

      .columns .column .links::-webkit-scrollbar-track {
        background-color: transparent;
      }

      .columns .column .links::-webkit-scrollbar {
        width: 6px;
        background-color: transparent;

      }

      .columns .column .links::-webkit-scrollbar-thumb {
        background-color: transparent;

      }

      .columns .column .links .link {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        width: 100%;
        margin-bottom: 4px;
      }

      .columns .column .links .link a {
        font-size: 14px;
        line-height: 1.25;
        font-weight: 300;
        color: #3565A9;
        text-decoration: none;
      }

      .columns .column .links .link>div {
        padding-top: 5px;
        padding-left: 5px;
      }

      .columns .column .links .link .time {
        display: inline-block;
        width: 30px;
        color: #757575;
        font-size: 12px;
        line-height: 16px;
        text-decoration: dotted;
        text-decoration-line: underline;
        text-decoration-color: #b2b2b2;
        text-underline-offset: 2px;
        vertical-align: text-top;
        cursor: default;
      }

      // @media (max-width: 1200px) {
        .columns {
          gap: 30px;
        }
      // }

      @media (max-width: 770px) {
        .wrapper {
          padding-left: 20px;
          padding-right: 20px;
        }

        .columns {
          gap: 20px;
        }

        .columns .column .links {
            height: auto;
            overflow: hidden;
        }

       
      }
      `}
    </style>
  </div>)
}