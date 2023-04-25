import styles from './turra.module.css';

export default function ({ id, tweetText, metadata, embed }) {
    return <div className={styles.tweet} key={id} id={id}>
        <p dangerouslySetInnerHTML={{ __html: tweetText }}></p>
        {metadata && metadata.url && <span className={styles.metadata}>
            <a href={metadata.url} target="_blank" className={`${!metadata.img ? "big-url" : ""}`}>{metadata.img && <img src={"../" + metadata.img}></img>}
                {metadata.title && <span className={styles.caption}>{metadata.title}</span>}
                {!metadata.title && <span className={styles.caption}>{metadata.url}</span>}
            </a>
        </span>}
        {metadata && !metadata.url && metadata.img && <span className={styles.metadata}>
            <img src={"../" + metadata.img}></img>
        </span>}
        {embed && embed.type === "embed" && <a
            href={"https://twitter.com/" + embed.author.split("\n").pop().replace("@", "") + "/status/" + embed.id}
            className={`${styles['static-tweet']}`}
            target="_blank"
        >
            <div className={`${styles['static-tweet-author']}`}>
                <div className={styles.icon}></div> {embed.author}
            </div>
            <p className={`${styles['static-tweet-text']}`}>
                {embed.tweet}
                {!embed.tweet && <span className={styles['tweet-not-found']} >Click para visualizar en Twitter.</span>}
            </p>
        </a>}
    </div>;
}