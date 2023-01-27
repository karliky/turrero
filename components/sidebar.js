export default function ({ books, videos, linkedin, urls, wikipedia }) {
    return <div className='flex-right side-block'>
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
    </div>;
}