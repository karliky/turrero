import dotenv from "dotenv";
import OpenAI from "openai";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHORS } from "../infrastructure/constants.ts";
import { TweetMetadataType } from "../infrastructure/types/index.ts";
import type { Tweet } from "../infrastructure/types/index.ts";
import { getDbPath, getScriptDirectory } from "./libs/common-utils.ts";
import { createDataAccess } from "./libs/data-access.ts";

dotenv.config();

const scriptDir = getScriptDirectory(import.meta.url);
const tweetId = process.argv[2];

const replacements: Record<string, string> = {
  WEF: "Foro Económico Mundial",
  CPS: "Complex Problem Solving",
  [`${AUTHORS.RECUENCO.NAME}${AUTHORS.RECUENCO.X}`]: AUTHORS.RECUENCO.NAME,
  [AUTHORS.RECUENCO.NAME]: AUTHORS.RECUENCO.NAME,
  "P.D. I:": "Postdata 1:",
  "P.D. II:": "Postdata 2:",
  "P.D. III:": "Postdata 3:",
};

if (!tweetId) {
  console.error("Usage: npm run podcast -- <threadId>");
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Please provide OPENAI_API_KEY");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });
const outputPath = join(getDbPath(scriptDir), "podcast", `${tweetId}.txt`);

if (existsSync(outputPath)) {
  console.error(
    "Podcast already exists for this tweet id. Please delete it first if you want to regenerate it.",
  );
  process.exit(1);
}

const dataAccess = createDataAccess(scriptDir);
const tweets = await dataAccess.getTweets();
const enrichments = await dataAccess.getTweetsEnriched();
const threadTweets = tweets.find((thread) => thread[0]?.id === tweetId);

if (!threadTweets) {
  console.error("Tweet not found");
  process.exit(1);
}

const thread: string = threadTweets.reduce((acc: string, t: Tweet) => {
  let paragraph = t.tweet;

  const embed = t.metadata?.embed;
  if (embed?.type === TweetMetadataType.EMBED) {
    paragraph += `
      TWEET PARA DAR CONTEXTO. AUTOR ${
      (embed.author ?? "").trim().replace(/\n/g, "")
    }.
      TWEET: ${embed.tweet}
      CONTINUA TEXTO ORIGINAL:`;
  }

  const enrichment = enrichments.find((item) => item.id === t.id);
  if (
    enrichment && enrichment.type === TweetMetadataType.CARD &&
    enrichment.media === "goodreads"
  ) {
    console.log("MEDIA", enrichment);
    paragraph += `
      LIBRO PARA DAR CONTEXTO ${enrichment.title}.
      CONTINUA TEXTO ORIGINAL:`;
  }

  return `${acc}\n${paragraph}`;
}, "");

const applyReplacements = (text: string): string => {
  let newText = text;
  for (const [key, value] of Object.entries(replacements)) {
    newText = newText.replace(new RegExp(key, "g"), value);
  }
  return newText;
};

const prompt: string = `
Considera todos estos pasos:
- Sobre el texto dado, solo corrige faltas de ortografía, no cambies ninguna otra palabra.
- Si aparece un TWEET PARA DAR CONTEXTO en el texto debes introducirlo diciendio "{Nombre de la persona reescrito de forma audible} comentó en x.com:", para que cuando se escuche tenga sentido para quien lo escucha.
- Si aparece un LIBRO PARA DAR CONTEXTO en el texto debes introducirlo como creas oportuno para que cuando se escuche tenga sentido para quien lo escucha.
- Si aparece algún texto tipo P.D. I, P.D. II, esto quiere decir postdata. Puedes introducirlo sin cambiar el texto.
- No introduzcas bloques con titulo por cada seccion, tu respuesta solo debe incluir el texto original procesado por las reglas anteriores.
- No renombres ninguna palabra, solo corrige faltas de ortografía pero no cambies ninguna palabra por otra.
- La palabra "turra" no es una palabra a corregir. Nunca reemplaces la palabra turra. Nunca reemplaces la frase "hilo turras de hoy"

Aqui tienes el texto:
`;

const fullText: string = prompt + thread;
console.log(fullText);

async function main(): Promise<void> {
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: fullText }],
  });
  const finalText = applyReplacements(
    chatCompletion.choices[0]?.message.content || "",
  );
  writeFileSync(outputPath, finalText);
  console.log(`Estaré ahí mismo`);
  process.exit(0);
}

await main();
