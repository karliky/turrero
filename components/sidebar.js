export default function ({ books, videos, linkedin, urls, wikipedia, summary, categories, tweetId }) {
    const getTitle = (title) => {
        return {
            highlightedText: title.split(" ").slice(0, 2).join(" "),
            rest: title.split(" ").slice(2, 999).join(" ")
        };
    }
    const title = (getTitle(summary).highlightedText + " " + getTitle(summary).rest);
    const categoriesAsText = categories.split(",")[0].replaceAll("-", " ");
    const sharingText = encodeURI("La turra de @recuenco sobre " + categoriesAsText + ":\n" + title + "\nhttps://turrero.vercel.app/turra/" + tweetId);
    return <div className='flex-right'>
        <div className='side-block'>
            {!books.length && !videos.length && !linkedin.length && !urls.length && !wikipedia.length && <div>No hay información adicional en esta turra.</div>}
            {!!videos.length && <div>
                <div className='metadata-section'><img className="icon" src="/youtube.svg" alt="Enlaces a youtube" />Videos relacionados:</div>
                {videos.map(metadata => <a key={metadata.id + "-video"} target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!books.length && <div>
                <div className='metadata-section'><img className="icon" src="/book.svg" alt="Enlaces a Goodreads" />Libros relacionados:</div>
                {books.map(metadata => <a key={metadata.id + "-book"} target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!linkedin.length && <div>
                <div className='metadata-section'><img className="icon" src="/linkedin.svg" alt="Enlaces a Linkedin" />Artículos en linkedin relacionados:</div>
                {linkedin.map(metadata => <a key={metadata.id + "-linkedin"} target="_blank" className="related" href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!wikipedia.length && <div>
                <div className='metadata-section'><img className="icon" src="/wikipedia.svg" alt="Enlaces a Wikipedia" />Artículos de Wikipedia:</div>
                {wikipedia.map((metadata, key) => <a key={key + "-wikipedia"} target="_blank" className="related" href={metadata.url}>{metadata.url}</a>)}
            </div>}
            {!!urls.length && <div>
                <div className='metadata-section'><img className="icon" src="/link.svg" alt="Índice de URLs" />Índice de URLs:</div>
                {urls.map((url, key) => <a key={key + "-url"} target="_blank" className="related" href={url}>{url}</a>)}
            </div>}
        </div>
        <div className='side-block'>
            <div>Comparte esta turra con el mundo:</div>
            <div className="sharing">
            <div className="social-media twitter"><a href={"https://twitter.com/intent/tweet?text=" + sharingText} target="_blank"><img className="icon" src="/twitter-white.svg" alt="Compartir en Twitter" />Compartir en Twitter</a></div>
            <div className="social-media linkedin"><a href={"http://www.linkedin.com/shareArticle?url=" + "https://turrero.vercel.app/turra/" + tweetId + "&title="+ encodeURI("La turra de @recuenco sobre " + categoriesAsText)} target="_blank"><img className="icon" src="/linkedin-white.svg" alt="Compartir en Linkedin" />Compartir en Linkedin</a></div>
            </div>
        </div>
    </div>;
}