import styles from './turra.module.css';


const BackLink = ({ href, altText, children }) => (
    <a href={href} className={styles.back}>
        <img src="/back.svg" alt={altText} />
        {children}
    </a>
);

export default function ({ summary, categories, publishedDate, tweetId, tweets, printMode = false }) {
    const getTitle = (title) => {
        return {
            highlightedText: title.split(" ").slice(0, 2).join(" "),
            rest: title.split(" ").slice(2, 999).join(" ")
        };
    }
    const Title = ({ title }) => {
        const { highlightedText, rest } = getTitle(title);
        return <>
            <span className={styles.brand}>{highlightedText} </span>{rest}
        </>;
    }
    function readingTime(text = "") {
        const wpm = 225;
        const words = text.split(" ").length;
        const time = Math.ceil(words / wpm);
        return time;
    }
    const formatTitle = (title) => title.charAt(0).toUpperCase() + title.slice(1);
    const unrolledThread = tweets.reduce((acc, { tweet }) => acc + tweet, "");
    const categoriesList = categories.split(",").map((category) => <span key={category} className={styles.category}><a href={"/#" + category.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}>{formatTitle(category.replaceAll("-", " "))}</a></span>);
    return (<div className={styles.header}>
        {printMode ? (
            <BackLink href={"#index" + tweetId} altText="Regresar al índice">Regresar al índice</BackLink>
        ) : (
            <BackLink href="/" altText="Volver atrás">El Turrero Post</BackLink>
        )}
        <h1><Title title={summary} /></h1>
        <h2>
            {publishedDate}.
            Tiempo de lectura: {readingTime(unrolledThread)}min.
            <a href={"https://twitter.com/Recuenco/status/" + tweetId} target="_blank">Leer en Twitter</a>
        </h2>
        <div className={styles.categories}>Categoría(s) de esta turra: {categoriesList}</div>
    </div>);
}