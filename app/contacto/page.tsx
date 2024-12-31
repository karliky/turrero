import Image from "next/image";

export const metadata = {
  title: "Contacto | El Turrero Post",
};

export default function ContactPage() {
  return (
    <main className="relative min-h-screen">
      {/* Background layers */}
      <div className="absolute inset-0">
        <Image
          src="/aliens.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-whiskey-900/90 via-whiskey-800/85 to-whiskey-700/80" />
      </div>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white mb-12 text-center">
          Contacto
        </h1>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* General Contact Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-whiskey-200/20 hover:transform hover:scale-105 transition-all">
            <h2 className="text-xl font-semibold text-whiskey-100 mb-4">
              Comunidad CPS
            </h2>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://x.com/CPSComunidad"
                  target="_blank"
                  className="text-whiskey-200 hover:text-whiskey-100 transition-colors flex items-center gap-2"
                >
                  Twitter/X de la comunidad CPS
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/karliky/turrero"
                  target="_blank"
                  className="text-whiskey-200 hover:text-whiskey-100 transition-colors"
                >
                  El Turrero Post en GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Support Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-whiskey-200/20 hover:transform hover:scale-105 transition-all">
            <h2 className="text-xl font-semibold text-whiskey-100 mb-4">
              Soporte principal
            </h2>
            <div className="space-y-3">
              <a
                href="https://x.com/nudpiedo"
                target="_blank"
                className="text-whiskey-200 hover:text-whiskey-100 transition-colors block"
              >
                Víctor R. Escobar
              </a>
              <a
                href="https://twitter.com/k4rliky"
                title="Programador guapo"
                target="_blank"
                className="text-whiskey-200 hover:text-whiskey-100 transition-colors block"
              >
                Karliky
              </a>
              <a
                href="https://x.com/4jr4m0s"
                target="_blank"
                className="text-whiskey-200 hover:text-whiskey-100 transition-colors block"
              >
                Ángel - アンヘル
              </a>
            </div>
          </div>

          {/* Friend Communities Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-whiskey-200/20 hover:transform hover:scale-105 transition-all">
            <h2 className="text-xl font-semibold text-whiskey-100 mb-4">
              Comunidades amigas
            </h2>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://twitter.com/Recuenco"
                  target="_blank"
                  className="text-whiskey-200 hover:text-whiskey-100 transition-colors"
                >
                  Javier G. Recuenco
                </a>
              </li>
              <li>
                <a
                  href="https://www.polymatas.com/"
                  target="_blank"
                  className="text-whiskey-200 hover:text-whiskey-100 transition-colors"
                >
                  Polymatas
                </a>
              </li>
              <li>
                <a
                  href="https://cps.tonidorta.com"
                  target="_blank"
                  className="text-whiskey-200 hover:text-whiskey-100 transition-colors"
                >
                  CPS Notebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Added quote */}
        <div className="text-center">
          <p className="text-whiskey-200 italic">
          “The greatest education in the world is watching the masters at work”
          </p>
          <p className="text-whiskey-300 text-sm mt-2">
            ― Michael Jackson
          </p>
        </div>
      </div>
    </main>
  );
}
