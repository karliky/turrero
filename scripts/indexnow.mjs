const host = "turrero.vercel.app";
const key = "d8451a2f43914302bbbd29072c425a99";
const origin = `https://${host}`;
const sitemapUrl = `${origin}/sitemap.xml`;
const keyLocation = `${origin}/${key}.txt`;

const decodeXml = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", "\"")
  .replaceAll("&apos;", "'");

const requestedUrls = process.argv.slice(2).filter((value) => !value.startsWith("--"));
let urlList;
if (requestedUrls.length > 0) {
  urlList = [...new Set(requestedUrls.map((value) => new URL(value, origin).href))];
} else {
  const sitemapResponse = await fetch(sitemapUrl);
  if (!sitemapResponse.ok) throw new Error(`Could not fetch ${sitemapUrl}: ${sitemapResponse.status}`);
  const sitemap = await sitemapResponse.text();
  urlList = [...new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/gs)].map((match) => decodeXml(match[1].trim())))];
}
if (urlList.length === 0) throw new Error("No URLs supplied to IndexNow");
if (urlList.length > 10_000) throw new Error(`IndexNow accepts at most 10000 URLs, received ${urlList.length}`);
for (const url of urlList) {
  if (new URL(url).hostname !== host) throw new Error(`Sitemap URL belongs to another host: ${url}`);
}

if (process.argv.includes("--dry-run")) {
  console.log(`Validated ${urlList.length} URLs for ${host}.`);
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});
if (![200, 202].includes(response.status)) {
  throw new Error(`IndexNow rejected the submission: ${response.status} ${await response.text()}`);
}
console.log(`Submitted ${urlList.length} URLs for ${host} to IndexNow (${response.status}).`);
