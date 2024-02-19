const Jimp = require("jimp");
const TweetsSummary = require('../db/tweets_summary.json');

const fileName = __dirname + '/../static/promo.png';
const fileNameOutput = __dirname + '/../public/meta/';

(async () => {
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    for (tweet of TweetsSummary) {
        const img = await Jimp.read(fileName);
        await img.print(font, 350, 200, tweet.summary + '.', 600).write(fileNameOutput + tweet.id + '.png');
    }
})();