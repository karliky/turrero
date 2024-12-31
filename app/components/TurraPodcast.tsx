'use client'

interface TurraPodcastProps {
  tweetId: string;
}

export function TurraPodcast({ tweetId }: TurraPodcastProps) {
  return (
    <div className="space-y-4 bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-whiskey-200 shadow-sm">
      <h2 className="text-lg font-bold text-whiskey-900">Escucha esta turra en formato podcast:</h2>
      <audio 
        controls 
        className="w-full"
        src={`/podcast/${tweetId}.mp3`}
      >
        Tu navegador no soporta el elemento de audio.
      </audio>
    </div>
  );
} 