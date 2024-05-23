import styles from './header.module.css';
import Search from "../components/search";

export default function Header({ totalTweets, noHeading }) {
  return <div className={styles.wrapper}>
    <div className={styles.header}>
      <div className={styles.header__section}>
        <h1 className={styles.header__brand}>
          <a href="/">El <span className={styles.red__color}>Turrero Post</span></a>
        </h1>
      </div>
      <div className={`${styles.header__section} ${styles.menu}`}>
        <a href="https://cps.tonidorta.com/" target='_blank'>CPS Notebook</a>
        <a href="/print">Versión imprimible</a>
        <a href="/about">Sobre esta web</a>
        <a href="/books">Libros</a>
        <a href="/hall-of-fame">Hall of Fame</a>
      </div>
      <div className={styles.header__section}>
        <Search />
      </div>
    </div>
    {!noHeading && <div className={styles.information}>
      <h2>Esta es la colección curada y ordenada de las publicaciones de <a className={styles.red__color} href='https://twitter.com/recuenco' target='_blank'>Javier. G. Recuenco</a> sobre las ciencias de la complejidad, CPS, Factor-X, etc...</h2>
      <h3>Hay un total de <span className={styles.total__tweets}>{totalTweets}</span> turras, la última actualización fue el 18/05/2024.</h3>
    </div>}
  </div>;
}