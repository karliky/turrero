const EXTERNAL_DATA_URL = 'https://turrero.vercel.app/';

function generateSiteMap(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://turrero.vercel.app</loc>
     </url>
     ${posts
      .map(({ id }) => {
        return `
       <url>
           <loc>${`${EXTERNAL_DATA_URL}turra/${id}`}</loc>
       </url>
     `;
      })
      .join('')}
   </urlset>
 `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

function getTweetIds() {
  return require('../db/tweets.json').map((tweet) => ({ id: tweet[0].id }));
}

export async function getServerSideProps({ res }) {
  // Get tweet IDs from db file
  const tweets = getTweetIds();
  // We generate the XML sitemap with the tweets data
  const sitemap = generateSiteMap(tweets);

  res.setHeader('Content-Type', 'text/xml');
  // we send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default SiteMap;