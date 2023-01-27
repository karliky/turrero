import Head from "next/head";

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
  const linkedin = enrichments.filter((tweet) => tweet.media === "linkedin");
  const formatTitle = (title) => title.charAt(0).toUpperCase() + title.slice(1);
  const unrolledThread = tweets.reduce((acc, { tweet }) => acc + tweet, "");

  const replaceURLWithHTMLLinks = (text) => {
    var exp = /(\b(https?|ftp|file):\/\/([-A-Z0-9+&@#%?=~_|!:,.;]*)([-A-Z0-9+&@#%?\/=~_|!:,.;]*)[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp, "<a href='$1' target='_blank'>$1</a>");
  }

  const title = `El Turrero Post - ${summary} - Las turras de Javier G. Recuenco`;

  return (<div>
    <Head>
      <title>{title}</title>
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    </Head>
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
          <div className="categories">Categoría(s) de esta turra: {categories.split(",").map((category) => <span key={category} className="category"><a href={"/#" + category}>{formatTitle(category.replaceAll("-", " "))}</a></span>)}</div>
        </div>
        <div className='flex-container'>
          <div className='flex-left'>{tweets.map(({ tweet, id, metadata: embeddedTweet }) => {
            const metadata = enrichments.find(_tweet => id === _tweet.id);
            let tweetText = replaceURLWithHTMLLinks(tweet);
            tweetText = tweetText.replace(/#(\S*)/g, '<a target="_blank" href="https://twitter.com/search?q=%23$1&src=typed_query">#$1</a>');
            tweetText = tweetText.replace(/@(\S*)/g, '<a target="_blank" href="http://twitter.com/$1">@$1</a>');
            const embed = embeddedTweet ? embeddedTweet.embed : undefined;
            return <div className='tweet' key={id}>
              <p dangerouslySetInnerHTML={{ __html: tweetText }}></p>
              {metadata && metadata.url && <span className="metadata">
                <a href={metadata.url} target="_blank" className={`${!metadata.img ? "big-url" : ""}`}>{metadata.img && <img src={"../" + metadata.img}></img>}
                  {metadata.title && <span className="caption">{metadata.title}</span>}
                </a>
              </span>}
              {embed && embed.type === "embed" && <a
                href={"https://twitter.com/" + embed.author.split("\n").pop().replace("@", "") + "/status/" + embed.id}
                className="static-tweet"
                target="_blank"
              >
                <div className="static-tweet-author">
                  <div className="icon"></div> {embed.author}
                </div>
                <p className="static-tweet-text">
                  {embed.tweet}
                  {!embed.tweet && <span className="tweet-not-found">Click para visualizar en Twitter.</span>}
                </p>
              </a>}
            </div>;
          })}</div>
          <div className='flex-right side-block'>
            {!books.length && !videos.length && !linkedin.length && <div>No hay información adicional en esta turra.</div>}
            {!!videos.length && <div>
              <div className='metadata-section'><img className="icon" src="/youtube.svg" alt="Enlaces a youtube" />Videos relacionados:</div>
              {videos.map(metadata => <a key={metadata.id + "-video"} target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!books.length && <div>
              <div className='metadata-section'><img className="icon" src="/book.svg" alt="Enlaces a Goodreads" />Libros relacionados:</div>
              {books.map(metadata => <a key={metadata.id + "-book"} target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!linkedin.length && <div>
              <div className='metadata-section'><img className="icon" src="/linkedin.svg" alt="Enlaces a Linkedin" />Artículos en linkedin relacionados:</div>
              {linkedin.map(metadata => <a key={metadata.id + "-linkedin"} target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
          </div>
        </div>
      </div>
      <div className="footer">
        El código fuente de este proyecto se encuentra en <a target="_blank" href="https://github.com/karliky/turrero">GitHub</a>.
        Envía tus mejoras a <a target="_blank" href="http://www.twitter.com/k4rliky">@k4rliky</a>.<br></br>
        <span className="small">Creado con Next.js y ChatGPT.</span>
      </div>
      <style jsx global>
        {`
.wrapper {
  width: 65%;
}

.category a {
  color: #fff;
  font-size: 1em;
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
  list-style-type: none;
  margin-left: 31px;
  margin-bottom: 8px;
  line-height: 1.3em;
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
  font-size: 0.5em;
  font-style: italic;
}

.side-block {
  background-color: #F5F5F5;
  padding: 20px;
  padding-left: 25px;
  padding-right: 25px;
  max-width: 50%;
  min-width: 35%;
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
  font-size: 1.9em;
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
}

.small {
  font-size: 0.6em;
}
          `}
      </style>
    </div>
  </div>);
}

export default Post;
