(async () => {
    const Threads = require('../db/tweets.json');

    const processThread = async (thread) => {
        const TweetId = thread[0].id;
        console.log("TweetId: " + TweetId);
        console.log(thread.map(({ tweet, metadata }) => {
            if (metadata && metadata.embed) {
                return tweet + '\n' + ("Contexto sobre el mensaje o tweet asociado a este texto: " + metadata.embed.tweet);
            }
            return tweet;
        }).join('\n'));
        process.exit(0);
    };

    Threads.forEach(processThread);
})();
