import { TweetProvider } from "../../infrastructure/TweetProvider";
import {
  TweetExam,
  Tweet,
  EnrichedTweetMetadata
} from "../../infrastructure/types";
import { TurraExam } from "./TurraExam";
import { RelatedLinks } from "./RelatedLinks";
import { TurraPodcast } from "./TurraPodcast";

interface TurraSidebarProps {
  exam?: TweetExam;
  thread: Tweet[];
}

export function TurraSidebar({ exam, thread }: TurraSidebarProps): React.ReactElement {
  // Create instance and get enriched data on the server
  const tweetProvider = new TweetProvider();
  const enrichedData = thread
    .map((tweet) => tweetProvider.getEnrichedTweetData(tweet.id))
    .filter(
      (data): data is EnrichedTweetMetadata =>
        !!data && (!!data.url || !!data.embeddedTweetId)
    );

  const hasPodcast = thread[0] ? tweetProvider.hasPodcast(thread[0].id) : false;

  return (
    <aside className="lg:col-span-4 space-y-8">
      {hasPodcast && thread[0] && <TurraPodcast tweetId={thread[0].id} />}
      <RelatedLinks enrichedData={enrichedData} thread={thread} />
      {exam && <TurraExam exam={exam} />}
    </aside>
  );
}
