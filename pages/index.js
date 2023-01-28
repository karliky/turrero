import Head from "next/head";
import Footer from "../components/footer";
import Search from "../components/search";

import TweetsMap from "../tweets_map.json";
import Tweets from "../tweets.json";
import TweetsSummary from "../tweets_summary.json";

export default function Turrero() {
  // TODO:
  // Añadir bloque de #preguntaalrecu
  // Añadir buscador https://github.com/olivernn/lunr.js
  // Move json files to a folder
  // Mostrar cards en diseño de card
  // Algunas fechas no están bien, por ejemplo https://twitter.com/Recuenco/status/1614168029876600833
  // Algunos enlaces a Goodreads.com tienen "Loading..." como titulo

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
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta property="og:title" content="El Turrero Post - Las turras de Javier G. Recuenco" />
      <meta name="description" content="El Turrero Post es la colección curada y ordenada de las publicaciones de Javier. G. Recuenco sobre las ciencias de la complejidad, CPS, Factor-X, etc..." key="desc" />
      <meta property="og:description" content="El Turrero Post es la colección curada y ordenada de las publicaciones de Javier. G. Recuenco sobre las ciencias de la complejidad, CPS, Factor-X, etc..." />
      <meta property="og:image" content="https://turrero.vercel.app/android-chrome-512x512.png"/>
    </Head>
    <div className="wrapper">
      <div className="header">
        <h1>El <span className="brand">Turrero Post</span></h1>
        <h2>La colección curada y ordenada de las publicaciones de Javier. G. Recuenco sobre las ciencias de la complejidad, CPS, Factor-X, etc...</h2>
        <h3>Hay un total de {Tweets.length} turras, la última actualización fue el {`${new Date().toLocaleDateString("es-ES")}`}.</h3>
        <Search />
      </div>
      <div className="columns">
        <div className="column">
          <div className="spacing">
            <div className="heading">
              <div className="title">Top 25 turras</div>
            </div>
            <div className="links">
              {top25.map((tweet) => {
                const timeAgo = Tweets.find(_tweet => _tweet[0].id === tweet.id);
                return <div className="link" key={tweet.id + "id-top"}>
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

      .small {
        font-size: 0.6em;
      }

      .columns {
        width: 100%;
      }

      .columns .column {
        display: inline-block;
        width: 50%;
        position: relative;
        vertical-align: top;
      }

      .columns .column .heading {
        width: 100%;
        height: 30px;
        font-weight: bold;
        color: #231f20;

        border-radius: 10px;
        box-shadow: 0 5px 5px rgb(0 0 0 / 3%), 0 2px 2px rgb(0 0 0 / 3%), 0 0 1px rgb(0 0 0 / 3%);
        border: 1px solid #e5e7eb;

        --turra-gradient-from: #f9fafb;
        --turra-gradient-to: rgba(249,250,251,0);
        --turra-gradient-stops: var(--turra-gradient-from),var(--turra-gradient-to);
        background-image: linear-gradient(to right,var(--turra-gradient-stops));
      }

      .columns .column .heading .title {
        padding: 5px;
        display: inline-block;
        position: absolute;
        top: 8px;
        left: 12px;
        font-size: 0.9em;
        font-weight: 500;
      }

      .columns .column .heading img {
        width: 50px;
      }

      .columns .column .links {
        display: block;
        width: 100%;
        height: 40vh;
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
        width: 100%;
      }

      .columns .column .links .link>div {
        padding-top: 5px;
        padding-left: 5px;
      }

      .columns .column .links .link .time {
        display: inline-block;
        width: 40px;
        color: gray;
        font-size: 0.9em;
        text-decoration: dotted;
        text-decoration-line: underline;
        text-decoration-color: #b2b2b2;
        text-underline-offset: 2px;
      }

      .columns .column .links .link .time {
        cursor: help;
      }

      /* Two-column layout */
      @media (max-width: 1200px) {
        .columns .column {
            width: 50%;
        }

        .wrapper {
            width: 85%;
        }
      }

      /* One-column layout */
      @media (max-width: 770px) {
        .columns .column .links {
            height: auto;
            overflow: hidden;
        }

        .columns .column {
            width: 100%;
        }

        .wrapper {
            width: 95%;
        }
      }
      `}
    </style>
  </div>)
}