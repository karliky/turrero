import { useRouter } from 'next/router';

export async function getStaticPaths() {
  const tweets = require("../../tweets.json");
  const paths = tweets.map((tweet) => ({
    params: { id: tweet[0].id },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps(context) {
  const tweets = require("../../tweets.json");
  const tweetsMap = require("../../tweets_map.json");
  const TweetsSummary = require("../../tweets_summary.json");
  const tweetId = context.params.id;
  return {
    props: {
      tweetId: tweetId,
      summary: TweetsSummary.find((_tweet => _tweet.id === tweetId)) || "",
      tweets: tweets.find(tweet => {
        return tweetId === tweet[0].id;
      }) || [],
    }
  }
}

const Post = ({ tweetId, tweets, summary }) => {
  console.log("tweets", tweetId, tweets.length, summary.summary);

  const getTitle = (title) => {
   const highlightedText = title.split(" ").slice(0, 5).join(" ");
   const rest = title.split(" ").slice(5, 999).join(" ");
   return <>
    <span className="brand">{highlightedText} </span>{rest}
   </>;
  }

  return (
    <div className="wrapper">
      <div className='header'>
        <a href="/"><img src="/back.svg" alt="Volver atrás" /></a>
        <h1>{getTitle(summary.summary)}</h1>
        <h2>{`Publicado el ${new Date(tweets[0].time).toLocaleDateString("es-ES")} / ${new Date(tweets[0].time).toLocaleTimeString("es-ES")}`} <a href={"https://twitter.com/Recuenco/status/" + tweetId} target="_blank">Leer en Twitter</a></h2>
      </div>
      <div className='flex-container'>
        <div  className='flex-left'>{tweets.map(({ tweet, id }) => <p className='tweet' key={id}>{tweet}</p>)}</div>
        <div  className='flex-right'>No hay libros mencionados en este hilo</div>
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
              font-size: 1.5em;
              margin-bottom: 5px;
              line-height: calc(1ex / 0.32);
            }
            .flex-container {
              display: flex;
              flex-direction: row;
            }
            .flex-left {
                width: 75%;
            }
            .flex-right {
                width: 25%;
            }
          `}
      </style>
    </div>
  );
}

export default Post;
