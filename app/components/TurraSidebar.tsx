import {
  TweetExam,
  Tweet,
  TweetProvider,
  EnrichedTweetMetadata,
} from "../../infrastructure/TweetProvider";
import { TurraExam } from "./TurraExam";
import { RelatedLinks } from "./RelatedLinks";
import { TurraPodcast } from "./TurraPodcast";

interface TurraSidebarProps {
  exam?: TweetExam;
  thread: Tweet[];
}

export function TurraSidebar({ exam, thread }: TurraSidebarProps) {
  // Create instance and get enriched data on the server
  const tweetProvider = new TweetProvider();
  const enrichedData = thread
    .map((tweet) => tweetProvider.getEnrichedTweetData(tweet.id))
    .filter(
      (data): data is EnrichedTweetMetadata =>
        !!data && (!!data.url || !!data.embeddedTweetId)
    );

  const hasPodcast = tweetProvider.hasPodcast(thread[0].id);

  return (
    <aside className="lg:col-span-4 space-y-8">
      {hasPodcast && <TurraPodcast tweetId={thread[0].id} />}
      <RelatedLinks enrichedData={enrichedData} thread={thread} />
      {exam && <TurraExam exam={exam} />}
    </aside>
  );
}
