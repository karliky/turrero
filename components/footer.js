import styles from './turra.module.css';

export default function Footer() {
    return <div className={styles.footer}>
        El código fuente de este proyecto se encuentra en <a target="_blank" href="https://github.com/karliky/turrero">GitHub</a>.
        Envía tus mejoras a <a target="_blank" title="Programador Guapo" href="http://www.twitter.com/k4rliky">@k4rliky</a>.<br></br>
        <span className={styles.small}>Creado con Next.js y ChatGPT. Algunos textos han sido generados por una Inteligencia Artificial y pueden no ser precisos o contener errores.</span>
    </div>;
}
