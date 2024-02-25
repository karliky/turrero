'use client';
import Head from "next/head";
import Image from 'next/image';
import Footer from "../components/footer";
import Header from "../components/header";
import styles from './hall-of-fame.module.css';

export async function getStaticProps(context) {
  return {
    props: { }
  }
}

const HallOfFame = ({}) => {
  const summary = `Las mejores turras y más influyentes.`;
  const title = `Hall Of Fame - Las turras de Javier G. Recuenco`;
  return (<div>
    <Head>
      <title>{title}</title>
      <meta content="text/html; charset=UTF-8" name="Content-Type" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />

      <meta name="description" content={summary} key="desc" />
      <meta property='og:url' content='https://turrero.vercel.app/about' />
      <meta property="og:title" content="Hall Of Fame - Las turras de Javier G. Recuenco" />
      <meta property="og:description" content={summary} />
      <meta property="og:image" content="https://turrero.vercel.app/promo.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@recuenco" />
      <meta name="twitter:creator" content="@k4rliky" />
      <meta name="twitter:title" content="Hall Of Fame - Las turras de Javier G. Recuenco" />
      <meta name="twitter:description" content={summary} />
      <meta name="twitter:image" content="https://turrero.vercel.app/promo.png"></meta>

    </Head>
    <div>
      <div className={styles.wrapper}>
        <Header noHeading />
        <div className={styles.content}>
          <div className={styles.heading}>
            <h1 className={styles['text-heading']}>🏆 El salon de la fama.</h1>
            <div>Las turras mas influyentes y conceptos fundamentales que debes conocer.</div>
            <div className={styles['hall-of-fame']}>
              <div className={styles['hall-of-fame__item']}>
                <h2 className={styles['hall-of-fame__title']}><span className={styles.hashtag}>#</span>El pompismo</h2>
                <div className={styles['hall-of-fame__description']}>El "pompismo" describe a quienes crean su propia realidad, ignorando la complejidad del mundo. Es un juego de simplificación, donde la verdad a menudo queda fuera. ¿Vivimos todos, en cierta medida, dentro de nuestras propias burbujas?</div>
                <ol className={styles['hall-of-fame__list']}>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1748598237563412826">Análisis crítico de los pompistas y el idealismo en la actualidad</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1751154901659381958">El pompismo, segunda parte: Reflexión sobre la adaptación y anticipación en un mundo en constante cambio</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1753677668996837620">Tercera y última parte del pompismo: El peligro del idealismo y la obsesión</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1758760266068590698">Explorando el cómic como expresión del pompismo</a></li>
                </ol>
              </div>
              <div className={styles['hall-of-fame__item']}>
                <h2 className={styles['hall-of-fame__title']}><span className={styles.hashtag}>#</span>Arquitectura de incentivos</h2>
                <div className={styles['hall-of-fame__description']}>La "arquitectura de incentivos" es el arte de moldear comportamientos mediante recompensas y castigos. Un buen diseño nos guía hacia el éxito; un paso en falso y fracasamos.</div>
                <ol className={styles['hall-of-fame__list']}>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1649673649866113024">Analizando la importancia de los incentivos en el ámbito empresarial y cómo influyen en el éxito o fracaso</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1738462543344005507">Metaincentivos y decisiones en corporaciones (sobre cómo hablar al board)</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1654727164086960130">Continúa la trilogía sobre incentivos: impacto en la dinámica corporativa</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1662345754642378753">Revelada la tercera parte de la trilogía sobre arquitectura de incentivos y modificación de comportamiento</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1398571638170529792">CPS real en grandes corporaciones cuando los incentivos están desalineados</a></li>
                </ol>
              </div>
              <div className={styles['hall-of-fame__item']}>
                <h2 className={styles['hall-of-fame__title']}><span className={styles.hashtag}>#</span>Inteligencia artificial</h2>
                <div className={styles['hall-of-fame__description']}>La inteligencia artificial en el CPS se nos presenta como una herramienta transformadora, capaz de llevar el peso de lo rutinario para que podamos volar hacia la innovación. Es más que tecnología; es una invitación a repensar nuestros límites.</div>
                <ol className={styles['hall-of-fame__list']}>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1720721564465823881">Analizando la fusión de Inteligencia Artificial y CPS en el mercado laboral</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1626829061723983872">Creatividad e Inteligencia Artificial: ¿Será la IA la muerte de la creatividad humana?</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1385833074001432576">La inteligencia se puede usar para tender puentes y no para agredir al diferente.</a></li>
                  <li className={styles['hall-of-fame__fame__list__item']}><a className={styles['hall-of-fame__fame__list__link']} href="https://turrero.vercel.app/turra/1728306256585101618">Finalizando la serie sobre IA y CPS: Reflexiones y Experiencias.</a></li>
               </ol>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.spacer}></div>
      </div>
      <Footer />
    </div>
  </div>);
}

export default HallOfFame;
