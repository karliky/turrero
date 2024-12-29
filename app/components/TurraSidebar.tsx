import {
  TweetExam,
  Tweet,
  TweetProvider,
  EnrichedTweetMetadata,
} from "../../infrastructure/TweetProvider";
import { TurraExam } from "./TurraExam";
import { RelatedLinks } from "./RelatedLinks";

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

  return (
    <aside className="lg:col-span-4 space-y-8">
      <RelatedLinks enrichedData={enrichedData} />
      {exam && <TurraExam exam={exam} />}
    </aside>
  );
}
