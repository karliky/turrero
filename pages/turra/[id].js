import { useRouter } from 'next/router';

export async function getStaticPaths() {
  const tweets = require("../../tweets.json");
  const paths = tweets.map((tweet) => ({
    params: { id: tweet[0].id },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps(context) {
  const Tweets = require("../../tweets.json");
  const TweetsMap = require("../../tweets_map.json");
  const TweetsSummary = require("../../tweets_summary.json");
  const TweetsEnriched = require("../../tweets_enriched.json");

  const tweetId = context.params.id;
  const summaryResult = TweetsSummary.find((_tweet => _tweet.id === tweetId)) || "";
  const categoriesResult = TweetsMap.find((_tweet => _tweet.id === tweetId)) || "";
  const thread = Tweets.find(tweet => {
    return tweetId === tweet[0].id;
  }) || [];
  return {
    props: {
      tweetId: tweetId,
      summary: summaryResult.summary || "",
      categories: categoriesResult.categories || "",
      tweets: thread,
      enrichments: TweetsEnriched.filter((_tweet) => thread.find((thread => thread.id === _tweet.id)))
    }
  }
}

const Post = ({ tweetId, summary, categories, tweets, enrichments }) => {
  console.log("tweets", tweetId, tweets.length, summary, categories, enrichments);

  const getTitle = (title) => {
    const highlightedText = title.split(" ").slice(0, 2).join(" ");
    const rest = title.split(" ").slice(2, 999).join(" ");
    return <>
      <span className="brand">{highlightedText} </span>{rest}
    </>;
  }

  function readingTime(text = "") {
    const wpm = 225;
    const words = text.split(" ").length;
    const time = Math.ceil(words / wpm);
    return time;
  }

  const books = enrichments.filter((tweet) => tweet.media === "goodreads");
  const videos = enrichments.filter((tweet) => tweet.media === "youtube");
  const formatTitle = (title) => title.charAt(0).toUpperCase() + title.slice(1);
  const unrolledThread = tweets.reduce((acc, { tweet }) => acc + tweet, "");
  return (
    <div>
      <div className="wrapper">
        <div className='header'>
          <a href="/"><img src="/back.svg" alt="Volver atrás" /></a>
          <h1>{getTitle(summary)}</h1>
          <h2>
            {`Publicado el 
                ${new Date(tweets[0].time).toLocaleDateString("es-ES")} / ${new Date(tweets[0].time).toLocaleTimeString("es-ES")}`}.
            Tiempo de lectura: {readingTime(unrolledThread)}min. <a href={"https://twitter.com/Recuenco/status/" + tweetId} target="_blank">Leer en Twitter</a>
          </h2>
          <div className="categories">Categorías de esta turra: {categories.split(",").map((category) => <span key={category} className="category">{formatTitle(category.replaceAll("-", " "))}</span>)}</div>
        </div>
        <div className='flex-container'>
          <div className='flex-left'>{tweets.map(({ tweet, id }) => {
            const metadata = enrichments.find(_tweet => id === _tweet.id);
            let tweetText = tweet.replace(/#(\S*)/g, '<a target="_blank" href="https://twitter.com/search?q=%23$1&src=typed_query">#$1</a>');
            tweetText = tweetText.replace(/@(\S*)/g, '<a target="_blank" href="http://twitter.com/$1">@$1</a>');
            console.log(metadata);
            return <p className='tweet' key={id}>
              {<span dangerouslySetInnerHTML={{ __html: tweetText }} />}
              {metadata && <span className="metadata">
                <a href={metadata.url} target="_blank"><img src={"../" + metadata.img}></img></a>
                {metadata.title && <span className="caption">{metadata.title}</span>}
              </span>}
            </p>;
          })}</div>
          <div className='flex-right side-block'>
            {!books.length && !videos.length && <div>No hay información adicional en este hilo.</div>}
            {books.length && <div>
            <span className='metadata-title'>🎥 Videos relacionados:</span>
              {videos.map(metadata => <a target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {books.length && <div>
            <span className='metadata-title'>📖 Libros relacionados:</span>
              {books.map(metadata => <a target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
          </div>
        </div>
        <style jsx global>
          {`
        @charset "utf-8";
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
              width:65%;
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
            
        a {
          color: #335F8D;
          text-decoration: underline;
          text-decoration-color: #335f8d14;
          font-size: 0.9em;
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
                position: sticky;
                top: 15px;
                align-self: flex-start;
            }
            .related {
              display: list-item;
              margin-left: 25px;
              margin-bottom: 8px;
              line-height: 1.3em;
            }
            .metadata {
              display: block;
              text-align: center;
            }
            .metadata-title {
              margin-bottom: 6px;
              margin-top: 4px;
              display: inline-block;
            }
            .metadata img {
              max-width:430px;
              max-height:205px;
              width: auto;
              height: auto;
              filter: grayscale(100%);
            }
            .metadata img:hover {
              filter: grayscale(0%);
            }
            .metadata .caption {
              display:block;
              font-size: 0.5em;
              font-style: italic;
            }
            .side-block {
              background-color: #F5F5F5;
              padding: 20px;
              padding-left: 25px;
              padding-right: 25px;
            }
            .categories {
              font-size: 0.5em;
              border-top: 1px solid #d9d9d9;
            }
            .category {
              display: inline-block;
              margin-right: 0.5em;
              padding: 0.0714285714em 0.7142857143em 0.1428571429em;
              border-radius: 2px;
              background-color: #78ceef;
              color: #fff;
              font-weight: 600;
              font-size: .7em;
              line-height: 1.5;
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
              .footer {
                padding: 5px;
              }
            }
            .footer {
              font-size: 1.25rem;
              line-height: 2.5rem;
              font-weight: 300;
              margin-top: 1em;
              margin-bottom: 1em;
              text-align: center;
            }
            .small {
              font-size: 0.6em;
            }
          `}
        </style>
      </div>
      <div className="footer">
        El código fuente de este proyecto se encuentra en <a target="_blank" href="https://github.com/karliky/turrero">GitHub</a>.
        Envía tus mejoras a <a target="_blank" href="http://www.twitter.com/k4rliky">@k4rliky</a>.<br></br>
        <span className="small">Creado con JavaScript y ChatGPT.</span>
      </div>
    </div>
  );
}

export default Post;
