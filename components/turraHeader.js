export default function ({ summary, categories, publishedDate, tweetId, tweets }) {
    const getTitle = (title) => {
        return {
            highlightedText: title.split(" ").slice(0, 2).join(" "),
            rest: title.split(" ").slice(2, 999).join(" ")
        };
    }
    const Title = ({ title }) => {
        const { highlightedText, rest } = getTitle(title);
        return <>
            <span className="brand">{highlightedText} </span>{rest}
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
    const categoriesList = categories.split(",").map((category) => <span key={category} className="category"><a href={"/#" + category.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}>{formatTitle(category.replaceAll("-", " "))}</a></span>);
    return <div className='header'>
        <a href="/" className="back"><img src="/back.svg" alt="Volver atrás" />El Turrero Post</a>
        <h1><Title title={summary}/></h1>
        <h2>
            {publishedDate}.
            Tiempo de lectura: {readingTime(unrolledThread)}min.
            <a href={"https://twitter.com/Recuenco/status/" + tweetId} target="_blank">Leer en Twitter</a>
        </h2>
        <div className="categories">Categoría(s) de esta turra: {categoriesList}</div>
    </div>;
}