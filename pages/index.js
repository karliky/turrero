import Head from "next/head";
import TweetsMap from "../tweets_map.json";
import Tweets from "../tweets.json";
import TweetsSummary from "../tweets_summary.json";

export default function Turrero() {
  // TODO: Añadir bloques de wikipedia y libros. Ordenar bloques for fecha

  const blockOrder = {
    "resolucion-de-problemas-complejos": [],
    "sistemas-complejos": [],
    "estrategia": [],
    "factor-x": [],
    "gaming": [],
    "lectura-de-señales": [],
    "gestion-del-talento": [],
    "marketing": [],
    "trabajo-en-equipo": [],
    "personotecnia": [],
    "orquestacion-cognitiva": [],
    "libros": [],
    "futurismo-de-frontera": [],
    "sociologia": [],
    "leyes-y-sesgos": [],
    "el-contexto-manda": [],
    "desarrollo-de-habilidades": [],
    "others": [],
  };

  function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "mo";
    interval = Math.floor(seconds / 604800);
    if (interval >= 1) return interval + "w";
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

  const tweets = categorizedTweets();
  const top25 = findTopTweets();
  const mostViews = findTopViews();
  return (<div>
    <Head>
      <title>Turrero Post</title>
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    </Head>
    <div className="wrapper">
      <div className="header">
        <h1>El <span className="brand">Turrero Post</span> es tu oportunidad de aprender más sobre las ciencias de la complejidad, CPS, Factor-X y demás en el mismo lugar.</h1>
        <h2>Hay un total de 132 turras, la última actualización fue el {`${new Date().toLocaleDateString("en-US")}`}</h2>
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
                    <div className="time">{timeSince(new Date(timeAgo[0].time).getTime())}</div>
                  </div>
                  <div>
                    <a href={"https://twitter.com/Recuenco/status/" + tweet.id}>{tweet.summary}</a>
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
                <div className="title">{key.replaceAll("-", " ")}</div>
              </div>
              <div className="links">
                {tweets[key].map((tweet) => {
                  const timeAgo = Tweets.find(_tweet => _tweet[0].id === tweet.id);
                  return <div className="link" key={tweet.id + "-" + key + "id"}>
                    <div>
                      <div className="time">{timeSince(new Date(timeAgo[0].time).getTime())}</div>
                    </div>
                    <div>
                      <a href={"https://twitter.com/Recuenco/status/" + tweet.id}>{tweet.summary}</a>
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
                    <div className="time">{timeSince(new Date(timeAgo[0].time).getTime())}</div>
                  </div>
                  <div>
                    <a href={"https://twitter.com/Recuenco/status/" + tweet.id}>{tweet.summary}</a>
                  </div>
                </div>
              }
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="footer">
        El código fuente de este proyecto se encuentra en <a target="_blank" href="https://github.com/karliky/turrero">Github</a>.
        Si quieres mejorar o cambiar algo también puedes contactarme en <a target="_blank" href="http://www.twitter.com/k4rliky">@k4rliky</a>
      </div>
    </div>
    <style jsx global>
      {`
        @charset "utf-8";
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;700&display=swap');

        /* http://meyerweb.com/eric/tools/css/reset/ 
        v2.0 | 20110126
        License: none (public domain)
     */
     
     html, body, div, span, applet, object, iframe,
     h1, h2, h3, h4, h5, h6, p, blockquote, pre,
     a, abbr, acronym, address, big, cite, code,
     del, dfn, em, img, ins, kbd, q, s, samp,
     small, strike, strong, sub, sup, tt, var,
     b, u, i, center,
     dl, dt, dd, ol, ul, li,
     fieldset, form, label, legend,
     table, caption, tbody, tfoot, thead, tr, th, td,
     article, aside, canvas, details, embed, 
     figure, figcaption, footer, header, hgroup, 
     menu, nav, output, ruby, section, summary,
     time, mark, audio, video {
       margin: 0;
       padding: 0;
       border: 0;
       font-size: 100%;
       font: inherit;
       vertical-align: baseline;
     }
     /* HTML5 display-role reset for older browsers */
     article, aside, details, figcaption, figure, 
     footer, header, hgroup, menu, nav, section {
       display: block;
     }
     body {
       line-height: 1;
     }
     ol, ul {
       list-style: none;
     }
     blockquote, q {
       quotes: none;
     }
     blockquote:before, blockquote:after,
     q:before, q:after {
       content: '';
       content: none;
     }
     table {
       border-collapse: collapse;
       border-spacing: 0;
     }

     * {
     box-sizing: border-box;
   }
        body {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
          color: #191817;
          background-color: #FEFEFD;
        }
        .wrapper {
          width:75%;
          margin:0 auto;
          min-height:64px;
          position:relative;
        }
        .header {
          font-size: 2.25rem;
          line-height: 2.5rem;
          font-weight: 300;
          margin-top: 1em;
          margin-bottom: 1em;
        }
        h2 {
          font-size: 1rem;
        }
        .brand {
          color: #a5050b;
              font-weight: bold;
        }
        .footer {
          font-size: 1.25rem;
          line-height: 2.5rem;
          font-weight: 300;
          margin-top: 1em;
          margin-bottom: 1em;
        }
        .spacing {
          padding: 6px;
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
          background: linear-gradient(to bottom, #fff, #f5f5f5);
          color: #231f20;
          box-shadow: inset 0 0 0 1px rgb(0 0 0 / 5%), 0 2px 2px -1px rgb(0 0 0 / 20%);
          border-radius: 10px;
        }
        .columns .column .heading .title {
          padding: 5px;
          display: inline-block;
          position: absolute;
          top: 8px;
          left: 12px;
          font-size: 0.9em;
          text-transform:capitalize;
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
      .columns .column .links::-webkit-scrollbar-track
      {
        background-color: transparent;
      }

      .columns .column .links::-webkit-scrollbar
      {
        width: 6px;
        background-color: transparent;

      }

      .columns .column .links::-webkit-scrollbar-thumb
      {
        background-color: transparent;

      }

        .columns .column .links .link {
          display: flex;
          flex-direction: row;
          width: 100%;
        }
        .columns .column .links .link > div {
          padding-top: 5px;
          padding-left: 5px;
        }
        .columns .column .links .link .time {
          display: inline-block;
          width: 40px;
          color: gray;
          font-size: 0.9em;
        }
        a {
          color: #335F8D;
          text-decoration: underline;
          text-decoration-color: #335f8d14;
          font-size: 0.9em;
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