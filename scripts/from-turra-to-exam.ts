import Threads from '../infrastructure/db/tweets.json' with { type: "json" };
import type { Tweet } from '../infrastructure/types/index.js';

(async (): Promise<void> => {
    const processThread = async (thread: Tweet[]): Promise<void> => {
        const TweetId: string = thread[0].id;
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