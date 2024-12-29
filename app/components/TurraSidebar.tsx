'use client'
import { TweetExam } from '../../infrastructure/TweetProvider';
import { TurraExam } from './TurraExam';

interface TurraSidebarProps {
  exam?: TweetExam;
}

export function TurraSidebar({ exam }: TurraSidebarProps) {
  if (!exam) return null;

  return (
    <aside className="lg:col-span-4">
      <TurraExam exam={exam} />
    </aside>
  );
}