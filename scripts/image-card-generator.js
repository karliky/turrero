import { Jimp, loadFont } from "jimp";
import { SANS_32_BLACK } from "jimp/fonts";
import TweetsSummary from '../infrastructure/db/tweets_summary.json' with { type: 'json' };


// Using standard Node built-ins for __filename, __dirname in ESM:
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.join(__dirname, '..', 'static', 'promo.png');
const fileNameOutput = path.join(__dirname, '..', 'public', 'meta');

(async () => {
    // 1) Load the built-in Jimp font
    const font = await loadFont(SANS_32_BLACK);

    // 2) Loop over TweetsSummary
    for (const tweet of TweetsSummary) {
        // 3) Read your input image
        const img = await Jimp.read(fileName);

        // 4) Print text at (350, 200) with max width of 600
        //    Note the argument order: (font, x, y, text, maxWidth)
        img.print(font, 350, 200, tweet.summary + '.', 600);

        // 5) Write out to a file
        //    It's usually best to use writeAsync in ESM contexts
        await img.writeAsync(path.join(fileNameOutput, `${tweet.id}.png`));
    }
})();