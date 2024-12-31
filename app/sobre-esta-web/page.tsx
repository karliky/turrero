import Image from 'next/image';

export default function SobreEstaWeb() {
  return (
    <div className="bg-whiskey-50 min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-whiskey-900 mb-8 text-center">
            Sobre el proyecto de El Turrero Post
          </h1>

          <div className="bg-white rounded-xl shadow-md p-6 mb-12">
            <div className="prose max-w-none mb-6">
              <p className="text-gray-600 leading-relaxed mb-6">
                El Turrero Post es un proyecto personal de aprendizaje. Las
                turras de Javier G. Recuenco contienen destellos de la
                genialidad sobre los que reflexionar. Este lugar está
                especialmente enfocado en ayudarte a entender la resolución de
                problemas complejos.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Como dijo el gran John Lasseter de Pixar: &ldquo;No podemos cambiar el
                mundo a menos que entendamos primero cómo funciona&rdquo;.
              </p>
              <p className="text-gray-600 leading-relaxed">
                El objetivo es ayudarte a comprender mejor el mundo a través de
                las turras, enlaces y charlas de temas relacionados con la
                complejidad. La mejor forma de ayudarnos es compartiéndolo con
                tus amigos y conocidos.
              </p>
            </div>
            <blockquote className="border-l-4 border-whiskey-600 pl-4 py-2 bg-whiskey-50 rounded-r-lg italic text-whiskey-800">
              &ldquo;Study the greats and become greater.&rdquo;
              <strong className="block mt-2 text-whiskey-900">
                - Michael Jackson
              </strong>
            </blockquote>
          </div>

          <div className="space-y-12">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex flex-col md:flex-row gap-8 mb-4">
                <div className="md:w-2/3">
                  <h2 className="text-2xl font-semibold text-whiskey-900 mb-2">
                    Javier G. Recuenco
                    <a
                      href="https://x.com/recuenco"
                      className="ml-2 text-whiskey-600 hover:text-whiskey-800 text-lg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @recuenco
                    </a>
                  </h2>
                  <h3 className="text-lg text-whiskey-700 mb-3">
                    El gran autor y pensador
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Cuando era joven, su objetivo era convertise en ingeniero
                    informático y trabajó en varios puestos relacionados con la
                    tecnología. Ahora busca transformar industrias y trabajar en
                    escenarios nunca antes vistos. Aprendí que siempre habrá
                    desafíos que superan a cualquier persona, independientemente
                    de su tamaño y éxito, y hay que estar preparados para lo
                    desconocido. Javier escribe semanalmente una disertación
                    llamada &ldquo;turra&rdquo; sobre las ciencias de la complejidad.
                  </p>
                </div>
                <div className="md:w-1/3">
                  <img
                    src="https://gurulibros.com/wp-content/uploads/2021/09/javier_g_recuenco.jpg"
                    alt="Javier G. Recuenco"
                    className="rounded-lg shadow-md w-full"
                    width={400}
                    height={400}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex flex-col md:flex-row gap-8 mb-4">
                <div className="md:w-1/3">
                  <img
                    src="https://avatars.githubusercontent.com/u/881069?v=4"
                    alt="Carlos Hernández Gómez (Karliky)"
                    className="rounded-lg shadow-md w-full"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="md:w-2/3">
                  <h2 className="text-2xl font-semibold text-whiskey-900 mb-2">
                    Carlos Hernández Gómez (Karliky)
                    <a
                      href="https://x.com/k4rliky"
                      className="ml-2 text-whiskey-600 hover:text-whiskey-800 text-lg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @k4rliky
                    </a>
                  </h2>
                  <h3 className="text-lg text-whiskey-700 mb-3">
                    Orquestador turrero
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Crecí entrando en zonas secretas de videojuegos. Siempre he
                    sentido curiosidad por saber más sobre el mundo fuera del
                    mío. Sigo los pasos de mi profesor del curso de resolución
                    de problema complejos de la UNIR para reflexionar cada vez
                    más y mejor.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-whiskey-900 mb-8 text-center">
              Colaboran con El Turrero Post
            </h2>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex flex-col md:flex-row gap-8 mb-4">
                <div className="md:w-2/3">
                  <h2 className="text-2xl font-semibold text-whiskey-900 mb-2">
                    Toni Dorta
                    <a
                      href="https://x.com/ToniDorta"
                      className="ml-2 text-whiskey-600 hover:text-whiskey-800 text-lg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @ToniDorta
                    </a>
                  </h2>
                  <h3 className="text-lg text-whiskey-700 mb-3">
                    Directivo especializado en el sector tecnológico
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Ingeniero informático con certificación PMP®, MBA y
                    experiencia en dirección de proyectos y gestión de equipos.
                    Ha trabajado como consultor en proyectos de innovación
                    tecnológica. Me enfoco en mejorar la productividad de las
                    empresas a través de la innovación de procesos y
                    herramientas. Toni ha creado el{" "}
                    <a
                      href="https://cps.tonidorta.com/"
                      className="text-whiskey-600 hover:text-whiskey-800"
                    >
                      CPS Notebook
                    </a>
                    . No se puede entender El Turrero Post sin la conexión
                    directa con el CPS Notebook.
                  </p>
                </div>
                <div className="md:w-1/3">
                  <img
                    src="https://www.tonidorta.com/wp-content/uploads/tonidorta_240x285.jpg"
                    alt="Toni Dorta"
                    className="rounded-lg shadow-md w-full"
                    width={240}
                    height={285}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex flex-col md:flex-row gap-8 mb-4">
                <div className="md:w-1/3">
                  <img
                    src="https://avatars.githubusercontent.com/u/8669176?v=4"
                    alt="Alejandra Arri"
                    className="rounded-lg shadow-md w-full"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="md:w-2/3">
                  <h2 className="text-2xl font-semibold text-whiskey-900 mb-2">
                    Alejandra Arri
                    <a
                      href="https://x.com/ladycircus"
                      className="ml-2 text-whiskey-600 hover:text-whiskey-800 text-lg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @ladycircus
                    </a>
                  </h2>
                  <h3 className="text-lg text-whiskey-700 mb-3">
                    La intersección entre el diseño y la creatividad
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Alejandra Arri es desarrolladora Full Stack que disfruta
                    tanto de la creatividad como del análisis. Descubrió que la
                    parte del Front-End le permite expresarse creativamente
                    mientras codifica y resuelve problemas. Es positiva,
                    organizada y le encanta trabajar en equipo.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex flex-col md:flex-row gap-8 mb-4">
                <div className="md:w-1/3">
                  <Image
                    src="/victor.jpeg"
                    alt="Víctor R. Escobar"
                    className="rounded-lg shadow-md w-full"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="md:w-2/3">
                  <h2 className="text-2xl font-semibold text-whiskey-900 mb-2">
                    Víctor R. Escobar
                    <a
                      href="https://x.com/nudpiedo"
                      className="ml-2 text-whiskey-600 hover:text-whiskey-800 text-lg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @nudpiedo
                    </a>
                  </h2>
                  <h3 className="text-lg text-whiskey-700 mb-3">
                    Políglota y buscador de la verdad
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Busco la verdad, aunque de vez en cuando doy palos de ciego por twitter. 
                    Disculpas si te di bastonazo. Los ideales nos hacen más mal que bien ⌘ 
                    Hablo 6 idiomas.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex flex-col md:flex-row gap-8 mb-4">
                <div className="md:w-1/3">
                  <Image
                    src="/angel.jpg"
                    alt="Ángel"
                    className="rounded-lg shadow-md w-full"
                    width={400}
                    height={400}
                  />
                </div>
                <div className="md:w-2/3">
                  <h2 className="text-2xl font-semibold text-whiskey-900 mb-2">
                    Ángel - アンヘル
                    <a
                      href="https://x.com/4jr4m0s"
                      className="ml-2 text-whiskey-600 hover:text-whiskey-800 text-lg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @4jr4m0s
                    </a>
                  </h2>
                  <h3 className="text-lg text-whiskey-700 mb-3">
                    Venture Manager y arquitecto cloud
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Venture manager, emba, strategy, product manager, coach/mentor, agilist, 
                    cloud architect, tech passionate, engineer, gopher, runner, rubik fan, 
                    日本語の学生！Do&apos;er
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
