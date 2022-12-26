import TweetCollection from "../../tweets.json";

export default function Home() {
  return (<div>
    <div className="head">
      <div className="headerobjectswrapper">
        {/* <div className="weatherforcastbox">
          <span>Una colección fácilmente accesible de las turras de <a href="https://www.twitter.com/recuenco">@recuenco</a>.</span>
        </div> */}
        <header>Turrero Post</header>
      </div>
      <div className="subhead">Lunes 26, Diciembre, 2022 - {TweetCollection.length} Turras</div>
    </div>
    <main>
        {TweetCollection.map((tweets) => {
          console.log(tweets[0].tweet);
          return <article key={tweets[0].id}>
          <div className="head">
            <span className="headline hl3">{tweets[0].tweet.split(' ').slice(0, 7).join(' ')}</span>
            <p>
              <span className="headline hl4">8:30 AM · Mar 12, 2022</span>
            </p>
          </div>
          <div>
          {tweets.map((tweet, index) => {
            return <div key={tweets[0].id + index}>
              <p className="words">{tweet.tweet}</p>
              {tweet.metadata && <div className="metadata"><img src={tweet.metadata.img}/></div>}
            </div>
          })}
          </div>
        </article>
        })}
    </main>
    <style jsx global>
      {
        ` body {
          font-family: 'Droid Serif', serif;
          font-size: 14px;
          color: #2f2f2f;
          background-color: #f9f7f1;
        }
  
        header {
          font-family: 'Playfair Display', serif;
          font-weight: 900;
          font-size: 80px;
          text-transform: uppercase;
          display: inline-block;
          line-height: 72px;
          margin-bottom: 20px;
        }
  
        p {
          margin-top: 0;
          margin-bottom: 20px;
        }
  
        .head {
          text-align: center;
          position: relative;
        }
  
        .headerobjectswrapper {}
  
        .subhead {
          text-transform: uppercase;
          border-bottom: 2px solid #2f2f2f;
          border-top: 2px solid #2f2f2f;
          padding: 12px 0 12px 0;
        }
  
        .weatherforcastbox {
          position: relative;
          width: 12%;
          left: 10px;
          border: 3px double #2f2f2f;
          padding: 10px 15px 10px 15px;
          line-height: 20px;
          display: inline-block;
          margin: 0 50px 20px -360px;
        }
  
        .content {
          font-size: 0;
          line-height: 0;
          word-spacing: -.31em;
          display: inline-block;
          margin: 30px 2% 0 2%;
        }
        .words {
          word-break: break-all;
        }
        .collumns {}
  
        {
          font-size: 14px;
          line-height: 20px;
          width: 17.5%;
          display: inline-block;
          padding: 0 1% 0 1%;
          vertical-align: top;
          margin-bottom: 50px;
          transition: all .7s;
        }
  
        .headline {
          text-align: center;
          line-height: normal;
          font-family: 'Playfair Display', serif;
          display: block;
          margin: 0 auto;
        }
  
        .headline.hl1 {
          font-weight: 700;
          font-size: 30px;
          text-transform: uppercase;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl2 {
          font-weight: 400;
          font-style: italic;
          font-size: 24px;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl2:before {
          border-top: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 7px;
          display: block;
          margin: 0 auto;
        }
  
        .headline.hl2:after {
          border-bottom: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 13px;
          display: block;
          margin: 0 auto;
        }
  
        .headline.hl3 {
          font-weight: 400;
          font-style: italic;
          font-size: 36px;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl4 {
          font-weight: 700;
          font-size: 12px;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl4:before {
          border-top: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 7px;
          display: block;
          margin: 0 auto;
        }
  
        .headline.hl4:after {
          border-bottom: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 10px;
          display: block;
          margin: 0 auto;
        }
  
        .headline.hl5 {
          font-weight: 400;
          font-size: 42px;
          text-transform: uppercase;
          font-style: italic;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl6 {
          font-weight: 400;
          font-size: 18px;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl6:before {
          border-top: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 7px;
          display: block;
          margin: 0 auto;
        }
  
        .headline.hl6:after {
          border-bottom: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 10px;
          display: block;
          margin: 0 auto;
        }
  
        .headline.hl7 {
          font-weight: 700;
          font-size: 12px;
          box-sizing: border-box;
          display: block;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl8 {
          font-weight: 700;
          font-size: 12px;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl9 {
          font-weight: 700;
          font-size: 12px;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .headline.hl10 {
          font-weight: 700;
          font-size: 12px;
          box-sizing: border-box;
          padding: 10px 0 10px 0;
        }
  
        .citation {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          line-height: 44px;
          /*font-style: italic;*/
          text-align: center;
          font-weight: 400;
          display: block;
          margin: 40px 0 40px 0;
          font-feature-settings: "liga", "dlig";
        }
  
        .citation:before {
          border-top: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 16px;
          display: block;
          margin: 0 auto;
        }
  
        .citation:after {
          border-bottom: 1px solid #2f2f2f;
          content: '';
          width: 100px;
          height: 16px;
          display: block;
          margin: 0 auto;
        }
  
        .figure {
          margin: 0 0 20px;
        }
  
        .figcaption {
          font-style: italic;
          font-size: 12px;
        }
  
        .media {
          -webkit-filter: sepia(80%) contrast(1) opacity(0.8);
          filter: sepia(80%) grayscale(1) contrast(1) opacity(0.8);
          mix-blend-mode: multiply;
          width: 100%;
        }
  
        .metadata {
          width: 100%;
        }
          
        .metadata img {
          filter: sepia(80%) grayscale(1) contrast(1) opacity(0.8);
          mix-blend-mode: multiply;
          width: 100%;
        }

        /*________________________________________________________________________________________________________________________________*/
        /*MEDIAQUERIES*/
        @media only all and (max-width: 1300px) {
          .weatherforcastbox {
            display: none;
          }
        }
  
        @media only all and (max-width: 1200px) {
          {
            width: 31%;
          }
        }
  
        @media only all and (max-width: 900px) {
          {
            width: 47%;
          }
        }
  
        @media only all and (max-width: 600px) {
          {
            width: 100%;
          }
  
          .collumn+{
            border-left: none;
            border-bottom: 1px solid #2f2f2f;
          }
  
          header {
            max-width: 320px;
            font-size: 60px;
            line-height: 54px;
            overflow: hidden;
          }
        }
        * {
        box-sizing: border-box;
      }
      img {
        width: 100%;
      }
      article {
        border-left: 1px solid #2f2f2f;
        padding-left: 10px;
        padding-right: 10px;
      }
      a:link,
      a:visited {
        color: black;
      }
      h1 {
          margin-top: 0;
          margin-left: 0.75rem;
      }
      main {
        columns: 250px;
        column-gap: 20px; 
      }
      article {
        break-inside: avoid-column;
        margin-bottom: 1rem; 
      }
        `
      }
    </style>
  </div>
  )
}