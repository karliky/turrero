import type { Thread, ThreadSummary } from "@/lib/types";
import { TurraExam } from "./TurraExam";
import { RelatedLinks } from "./RelatedLinks";
import { ThreadConnections } from "./ThreadConnections";

interface TurraSidebarProps {
  thread: Thread;
  citations: { cites: ThreadSummary[]; citedBy: ThreadSummary[] };
}

export function TurraSidebar({ thread, citations }: TurraSidebarProps) {
  return (
    <aside className="lg:col-span-4 min-w-0 space-y-8">
      <ThreadConnections cites={citations.cites} citedBy={citations.citedBy} />
      <RelatedLinks tweets={thread.tweets} />
      {thread.exam && <TurraExam questions={thread.exam} />}
    </aside>
  );
}
