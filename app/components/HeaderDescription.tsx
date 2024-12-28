interface HeaderDescriptionProps {
  totalTweets: number;
  lastUpdateDate: string;
}

export function HeaderDescription({ totalTweets, lastUpdateDate }: HeaderDescriptionProps) {
  return (
    <div className="mb-8 text-center">
      <p className="text-whiskey-800">
        Esta es la colección curada y ordenada de las publicaciones de{" "}
        <a
          className="font-bold text-brand hover:text-whiskey-950"
          href="https://x.com/recuenco"
          target="_blank"
        >
          Javier. G. Recuenco
        </a>{" "}
        sobre las ciencias de la complejidad, CPS, Factor-X, etc...
        <br />
        Hay un total de{" "}
        <span className="font-bold text-whiskey-650">{totalTweets}</span> turras, la
        última actualización fue el{" "}
        <span className="font-bold text-whiskey-650">{lastUpdateDate}</span>.
      </p>
    </div>
  );
} 