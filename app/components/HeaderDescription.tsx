interface HeaderDescriptionProps {
  totalTweets: number;
  lastUpdateDate: string;
}

export function HeaderDescription({ totalTweets, lastUpdateDate }: HeaderDescriptionProps) {
  return (
    <header className="max-w-3xl mx-auto mb-12 text-center">
      <p className="text-whiskey-800 leading-relaxed">
        Esta es la colección curada y ordenada de las publicaciones de{" "}
        <a
          className="font-semibold text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 underline decoration-whiskey-300 hover:decoration-whiskey-500"
          href="https://x.com/recuenco"
          target="_blank"
          rel="noopener noreferrer"
        >
          Javier G. Recuenco
        </a>{" "}
        sobre las ciencias de la complejidad, CPS, Factor-X, etc.
        <br className="hidden sm:block" />
        <span className="block mt-3">
          Hay un total de{" "}
          <strong className="font-semibold text-whiskey-900">{totalTweets}</strong> turras, 
          la última actualización fue el{" "}
          <time 
            className="font-semibold text-whiskey-900"
            dateTime={lastUpdateDate}
          >
            {lastUpdateDate}
          </time>
          .
        </span>
      </p>
    </header>
  );
} 