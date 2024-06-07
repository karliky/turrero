import Head from "next/head";
import Footer from "../components/footer";
import Header from "../components/header";
import Tweets from "../db/tweets.json";
import styles from './about.module.css';

export async function getStaticProps(context: any) {
  return {
    props: {}
  }
}

interface TurraProps { }

const Turra: React.FC<TurraProps> = ({ }) => {
  const title = `Sobre el proyecto de El Turrero Post - Las turras de Javier G. Recuenco`;
  const summary = `Sobre el proyecto de El Turrero Post`;

  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta content="text/html; charset=UTF-8" name="Content-Type" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />

        <meta name="description" content={summary} key="desc" />
        <meta property='og:url' content='https://turrero.vercel.app/about' />
        <meta property="og:title" content="Sobre el proyecto de El Turrero Post - Las turras de Javier G. Recuenco" />
        <meta property="og:description" content={summary} />
        <meta property="og:image" content="https://turrero.vercel.app/promo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@recuenco" />
        <meta name="twitter:creator" content="@k4rliky" />
        <meta name="twitter:title" content="Sobre el proyecto de El Turrero Post - Las turras de Javier G. Recuenco" />
        <meta name="twitter:description" content={summary} />
        <meta name="twitter:image" content="https://turrero.vercel.app/promo.png" />
      </Head>
      <div>
        <div className={styles.wrapper}>
          <Header totalTweets={Tweets.length} />
          <div className={styles.content}>
            <div className={styles.person}>
              <div className={styles.person__text}>
                <div className={styles.person__name}>Javier G. Recuenco</div>
                <div className={styles.person__title}>El gran autor y pensador</div>
                <div className={styles.person__description}>
                  Cuando era joven, su objetivo era convertise en ingeniero informático y trabajó en varios puestos relacionados con la tecnología.
                  Ahora busca transformar industrias y trabajar en escenarios nunca antes vistos.
                  Aprendí que siempre habrá desafíos que superan a cualquier persona, independientemente de su tamaño y éxito, y hay que estar preparados para lo desconocido.
                  Javier escribe semanalmente una disertación llamada "turra" sobre las ciencias de la complejidad.
                </div>
              </div>
              <div className={styles.person__image}>
                <img className={styles.boss} src="https://gurulibros.com/wp-content/uploads/2021/09/javier_g_recuenco.jpg" alt="Javier G. Recuenco" />
              </div>
            </div>
            <div className={styles.person}>
              <div className={styles.person__image}>
                <img src="https://avatars.githubusercontent.com/u/881069?v=4" alt="Carlos Hernández Gómez (Karliky)" />
              </div>
              <div className={styles.person__text}>
                <div className={styles.person__name}>Carlos Hernández Gómez (Karliky)</div>
                <div className={styles.person__title}>Orquestador turrero</div>
                <div className={styles.person__description}>
                  Crecí entrando en zonas secretas de videojuegos. Siempre he sentido curiosidad por saber más sobre el mundo fuera del mío.
                  Sigo los pasos de mi profesor del curso de resolución de problema complejos de la UNIR para reflexionar cada vez más y mejor.
                </div>
              </div>
            </div>
            <div className={styles.about}>
              <div className={styles.about__description}>
                El Turrero Post es un proyecto personal de aprendizaje.
                Las turras de Javier G. Recuenco contienen destellos de la genialidad sobre los que reflexionar.
                Éste lugar está especialmente enfocado en la solución de problemas complejos.
                Como dijo el gran John Lasseter de Pixar: "No podemos cambiar el mundo a menos que entendamos primero cómo funciona".
                El objetivo es ayudarte a comprender mejor el mundo a través de las turras, enlaces y charlas de temas relacionados con la complejidad.
                La mejor forma de ayudarnos es compartiendolo con tus amigos y conocidos.
              </div>
              <blockquote className={styles.blockquote} cite='http://html.conclase.net/w3c/html401...def-BLOCKQUOTE'>
                <p>“Study the greats and become greater.” <strong>- Michael Jackson</strong></p>
              </blockquote>
            </div>
            <h2 className={styles.contributor}>Colaboran con El Turrero Post</h2>
            <div className={styles.person}>
              <div className={styles.person__text}>
                <div className={styles.person__name}>Toni Dorta</div>
                <div className={styles.person__title}>Directivo especializado en el sector tecnológico </div>
                <div className={styles.person__description}>
                  Ingeniero informático con certificación PMP®, MBA y experiencia en dirección de proyectos y gestión de equipos.
                  Ha trabajado como consultor en proyectos de innovación tecnológica.
                  Me enfoco en mejorar la productividad de las empresas a través de la innovación de procesos y herramientas.
                  Toni ha creado el <a href="https://cps.tonidorta.com/">CPS Notebook</a>.
                  No se puede entender El Turrero Post sin la conexión directa con el CPS Notebook.
                </div>
              </div>
              <div className={styles.person__image}>
                <img src="https://secuora.es/wp-content/uploads/2020/06/toni-dorta-equipo-secuora-370x370.jpg" alt="Toni Dorta" />
              </div>
            </div>
            <div className={styles.person}>
              <div className={styles.person__image}>
                <img src="https://avatars.githubusercontent.com/u/8669176?v=4" alt="Alejandra Arri" />
              </div>
              <div className={styles.person__text}>
                <div className={styles.person__name}>Alejandra Arri</div>
                <div className={styles.person__title}>La intersección entre el diseño y la creatividad</div>
                <div className={styles.person__description}>
                  Alejandra Arri es desarrolladora Full Stack que disfruta tanto de la creatividad como del análisis.
                  Descubrió que la parte del Front-End le permite expresarse creativamente mientras codifica y resuelve problemas.
                  Es positiva, organizada y le encanta trabajar en equipo.
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default Turra;
