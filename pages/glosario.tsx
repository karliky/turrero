import Head from "next/head";
import Footer from "../components/footer";
import Header from "../components/header";
import Tweets from "../db/tweets.json";
import styles from './glosario.module.css';
import React, { useEffect, useState } from "react";

export async function getStaticProps(context: any) {
  return {
    props: {}
  }
}

type Data = {
  word: string
  definition: string
  sources?: string
}

type Glossary = {
  data: Data[]
}

const Turra: React.FC = () => {
  const title = `Sobre el proyecto de El Turrero Post - Las turras de Javier G. Recuenco`;
  const summary = `Sobre el proyecto de El Turrero Post`;
  const [values, setValues] = useState<Glossary>({ data: [] });

  useEffect(() => {
    fetch('/api/glosario')
      .then((res) => res.json())
      .then((data) => setValues({ data }));
  }, []);

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
          <Header totalTweets={Tweets.length} noHeading={true} />
          <div className={styles.centered}>

            <div className={styles.content}>
              <h2 className={styles.title}>Glosario</h2>
              <p>
                Aqui hay un glosario de la jerga especializada que se utiliza en las turras de Javier G. Recuenco. Recoger y explicar estos términos es una tarea en curso,
                a la cual puedes contribuir editando este fichero <a className={styles.word} href="https://github.com/karliky/turrero/blob/main/db/glosario.csv">CSV en github</a>, recuerda que lo puedes importar y editable en excel.
              </p>

              <table className={styles.glossary}>
                <thead>
                  <tr>
                    {/* <th>Palabra</th> */}
                    {/* <th>Definición</th> */}
                    {/* <th>Fuentes</th> */}
                  </tr>
                </thead>
                <tbody>
                  {values.data.map((row, index) => (
                    <tr key={index} className={styles.glossaryEntry}>
                      <td className={styles.word} >{row.word}</td>
                      <td>{row.definition}</td>
                      {/* <td>{row.sources || 'N/A'}</td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <Footer />
      </div >
    </div >
  );
}

export default Turra;
