import Jimp from "jimp";
import TweetsSummary from '../db/tweets_summary.json' assert { type: 'json' };

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = __dirname + '/../static/promo.png';
const fileNameOutput = __dirname + '/../public/meta/';

(async () => {
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    for (let tweet of TweetsSummary) {
        const img = await Jimp.read(fileName);
        await img.print(font, 350, 200, tweet.summary + '.', 600).write(fileNameOutput + tweet.id + '.png');
    }
})();