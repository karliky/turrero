import type { Thread } from "@/lib/types";
import { TurraExam } from "./TurraExam";
import { RelatedLinks } from "./RelatedLinks";
import { TurraPodcast } from "./TurraPodcast";

export function TurraSidebar({ thread }: { thread: Thread }) {
  return (
    <aside className="lg:col-span-4 space-y-8">
      {thread.podcastUrl && <TurraPodcast src={thread.podcastUrl} />}
      <RelatedLinks tweets={thread.tweets} />
      {thread.exam && <TurraExam questions={thread.exam} />}
    </aside>
  );
}
