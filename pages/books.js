import Head from "next/head";
import Image from 'next/image';
import Footer from "../components/footer";
import Header from "../components/header";
import styles from './books.module.css';
import books from '../db/books.json';

export async function getStaticProps(context) {
  return {
    props: { books }
  }
}

const Turra = ({ books }) => {
  const title = `Libros - Las turras de Javier G. Recuenco`;
  const summary = `Libros`;
  return (<div>
    <Head>
      <title>{title}</title>
      <meta content="text/html; charset=UTF-8" name="Content-Type" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />

      <meta name="description" content={summary} key="desc" />
      <meta property='og:url' content='https://turrero.vercel.app/about' />
      <meta property="og:title" content="Libros - Las turras de Javier G. Recuenco" />
      <meta property="og:description" content={summary} />
      <meta property="og:image" content="https://turrero.vercel.app/promo.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@recuenco" />
      <meta name="twitter:creator" content="@k4rliky" />
      <meta name="twitter:title" content="Libros - Las turras de Javier G. Recuenco" />
      <meta name="twitter:description" content={summary} />
      <meta name="twitter:image" content="https://turrero.vercel.app/promo.png"></meta>

    </Head>
    <div>
      <div className={styles.wrapper}>
        <Header noHeading />
        <div className={styles.content}>
          <div className={styles.heading}>
            <h1 className={styles['text-heading']}>Todos los libros mencionados en las turras.</h1>
            <div>Hay un total de {books.length} libros.</div>
          </div>
          <div className={styles.books}>
            {books && books.map((book, index) => {
              const img = book.img.replace('./', '/') || `/metadata/SJJzT3AT_6.jpeg`;
              return (<div key={index} className={styles.book}>
                <Image
                  src={img}
                  alt={book.title}
                  width={200}
                  height={300}
                />
                <div className={styles.info}>
                  <h2 clasName={styles.title}>
                    <a href={book.url}>{book.title}</a>
                  </h2>
                  <p><a className={styles['secondary-link']} target="_blank" href={"https://twitter.com/Recuenco/status/" + book.id}>Tweet original</a></p>
                </div>
              </div>);
            })}
          </div>
        </div>
        <div className={styles.spacer}></div>
        <div className={styles.more}>
          <h2><strong>¿Quieres más libros?</strong></h2>
          <p>📖 <a href="https://heavymental.es/recursos/complex-problem-solving-books/">Complex problem solving books by Heavy mental</a></p>
        </div>
      </div>
      <Footer />
    </div>
  </div>);
}

export default Turra;
