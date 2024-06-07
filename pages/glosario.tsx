import Head from "next/head";
import Footer from "../components/footer";
import Header from "../components/header";
import Tweets from "../db/tweets.json";
import styles from './glosario.module.css';
import React from "react";
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

type Data = {
  word: string
  definition: string
  sources?: string
}

type GlossaryProps = {
  data: Data[];
}

export async function getStaticProps() {
  const results: Data[] = [];
  const filePath = path.join(process.cwd(), 'db', 'glosario.csv');

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ',', escape: '"', headers: ['word', 'definition', 'sources'] }))
      .on('data', (data) => {
        results.push({
          word: data.word, definition: data.definition, sources: data.sources || ''
        });
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error: any) => {
        reject(error);
      });
  });

  return {
    props: {
      data: results,
    },
  };
}

const Glossary: React.FC<GlossaryProps> = ({ data }) => {
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
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => {
                    // only alphanumeric, no spaces, no special characters
                    const id = row.word.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return (
                      <tr key={index} id={id} className={styles.glossaryEntry}>
                        <td className={styles.word}>
                          <a href={`#${id}`}>{row.word}</a></td>
                        <td>{row.definition}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default Glossary;
