const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();
const Tweets = require('../db/tweets.json');
const TweetsEnrichements = require('../db/tweets_enriched.json');

const openai = new OpenAI(process.env.OPENAI_API_KEY);
const tweetId = process.argv[2];

const replacements = {
  WEF: 'Foro Económico Mundial',
  CPS: 'Complex Problem Solving',
  "Javier G. Recuenco@Recuenco": 'Javier Recuenco',
  "Javier G. Recuenco": 'Javier Recuenco',
  "P.D. I:": "Postdata 1:",
  "P.D. II:": "Postdata 2:",
  "P.D. III:": "Postdata 3:"
};

if (!tweetId) {
  console.error('Please provide a tweet id');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('Please provide OPENAI_API_KEY');
  process.exit(1);
}

const outputPath = __dirname + `/../db/podcast/${tweetId}.txt`;

if (fs.existsSync(outputPath)) {
  console.error('Podcast already exists for this tweet id. Please delete it first if you want to regenerate it.');
  process.exit(1);
}

const tweetIndex = Tweets.findIndex((tweet) => tweet[0].id === tweetId);

if (!tweetIndex) {
  console.error('Tweet not found');
  process.exit(1);
}

const thread = Tweets[tweetIndex].reduce((acc, t) => {
  let paragraph = t.tweet;

  if (t?.metadata?.embed?.type === 'embed') {
    paragraph += `
      TWEET PARA DAR CONTEXTO. AUTOR ${t.metadata.embed.author.trim().replace(/\n/g, '')}.
      TWEET: ${t.metadata.embed.tweet}
      CONTINUA TEXTO ORIGINAL:`;
  }

  const hasEnrichment = TweetsEnrichements.find((enrichment) => enrichment.id === t.id);
  if (hasEnrichment && hasEnrichment.type === 'card' && hasEnrichment.media === 'goodreads') {
    console.log('MEDIA', hasEnrichment);
    paragraph += `
      LIBRO PARA DAR CONTEXTO ${hasEnrichment.title}.
      CONTINUA TEXTO ORIGINAL:`;
  }

  return `${acc}\n${paragraph}`;
}, '');

const applyReplacements = (text) => {
  let newText = text;
  for (const [key, value] of Object.entries(replacements)) {
    newText = newText.replace(new RegExp(key, 'g'), value);
  }
  return newText;
};

const prompt = `
Considera todos estos pasos:
- Sobre el texto dado, solo corrige faltas de ortografía, no cambies ninguna otra palabra.
- Si aparece un TWEET PARA DAR CONTEXTO en el texto debes introducirlo diciendio "{Nombre de la persona reescrito de forma audible} comentó en Twitter:", para que cuando se escuche tenga sentido para quien lo escucha.
- Si aparece un LIBRO PARA DAR CONTEXTO en el texto debes introducirlo como creas oportuno para que cuando se escuche tenga sentido para quien lo escucha.
- Si aparece algún texto tipo P.D. I, P.D. II, esto quiere decir postdata. Puedes introducirlo sin cambiar el texto.
- No introduzcas bloques con titulo por cada seccion, tu respuesta solo debe incluir el texto original procesado por las reglas anteriores.
- No renombres ninguna palabra, solo corrige faltas de ortografía pero no cambies ninguna palabra por otra.
- La palabra "turra" no es una palabra a corregir. Nunca reemplaces la palabra turra. Nunca reemplaces la frase "hilo turras de hoy"

Aqui tienes el texto:
`;

const fullText = prompt + thread;
console.log(fullText);
async function main() {
  const result = [];
  const stream = await openai.beta.chat.completions.stream({
    model: 'gpt-4',
    messages: [{ role: 'user', content: fullText }],
    stream: true,
  });

  stream.on('content', (delta, snapshot) => {
    result.push(delta);
  });

  const chatCompletion = await stream.finalChatCompletion();
  const finalText = applyReplacements(chatCompletion.choices[0].message.content);
  fs.writeFileSync(outputPath, finalText);
  console.log(`Estaré ahí mismo`);
  process.exit(0);
}

main();