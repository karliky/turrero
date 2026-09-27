export function TurraPodcast({ src }: { src: string }) {
  return (
    <div className="space-y-4 bg-white/50 backdrop-blur-xs p-4 rounded-lg border border-whiskey-200 shadow-xs">
      <h2 className="text-lg font-bold text-whiskey-900">Escucha esta turra en formato podcast:</h2>
      <audio controls className="w-full" src={src}>
        Tu navegador no soporta el elemento de audio.
      </audio>
    </div>
  );
}
