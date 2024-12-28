export function AdvertisementCard() {
  return (
    <div className="relative overflow-hidden rounded-lg shadow-lg group">
      <div className="absolute inset-0 bg-gradient-to-br from-whiskey-300/65 to-whiskey-800/65 group-hover:opacity-75 transition-opacity" />
      <img
        src="/ss.png"
        alt="Advertisement"
        className="w-full h-full object-fit"
      />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <h3 className="text-2xl font-bold text-whiskey-50 mb-2">
          Buscamos problemas.
        </h3>
        <p className="text-whiskey-200 mb-4 drop-shadow-md">
          En Singular Solving resolvemos problemas complejos empresariales.
        </p>
        <a
          className="bg-whiskey-50 text-whiskey-900 px-6 py-2 rounded-full font-medium hover:bg-whiskey-100 transition-colors inline-block w-fit"
          href="https://singularsolving.com/"
          target="_blank"
        >
          Saber más
        </a>
      </div>
    </div>
  );
} 