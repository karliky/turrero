import { useRef, useState } from "react";
import ConfettiExplosion from 'react-confetti-explosion';
import styles from './sidebar.module.css';

const TweetsPodcast = require("../db/tweets_podcast.json");
const ExamQuestions = require("../db/tweets_exam.json");

export default function ({ books, videos, linkedin, urls, wikipedia, summary, categories, tweetId, printMode = false }) {
    const { questions } = ExamQuestions.find(({ id }) => id === tweetId);
    const hasPodcast = !!TweetsPodcast.find(({ id }) => id === tweetId);
    const hasQuestions = !!questions.length;
    const questionsRef = useRef();
    const [hideQuestions, setHideQuestions] = useState(false);
    const [hasFailed, setHasFailed] = useState(false);
    const getTitle = (title) => {
        return {
            highlightedText: title.split(" ").slice(0, 2).join(" "),
            rest: title.split(" ").slice(2, 999).join(" ")
        };
    }
    const title = (getTitle(summary).highlightedText + " " + getTitle(summary).rest);
    const categoriesAsText = categories.split(",")[0].replaceAll("-", " ");
    const sharingText = encodeURI("La turra de @recuenco sobre " + categoriesAsText + ":\n" + title + "\nhttps://turrero.vercel.app/turra/" + tweetId);

    const checkExam = () => {
        const answers = Array.from(questionsRef.current.querySelectorAll("input[type=radio]")).map(input => input.checked);
        const correctAnswers = ExamQuestions.find((({ id }) => id === tweetId)).questions.map(({ options, answer }) => options.map((_, index) => index + 1 === answer)).flat();
        const result = JSON.stringify(answers) === JSON.stringify(correctAnswers);
        setHasFailed(!result);
        setHideQuestions(result);
    };

    const Sharing = () => {
        return <div>
            <div className={styles['metadata-section']}><img className={styles.icon} src="/share-2.svg" alt="Compartir Turra" />Dale la turra a más gente</div>
            <div className={styles.sharing}>
                <div className={`${styles['social-media']} ${styles.twitter}`}><a href={"https://twitter.com/intent/tweet?text=" + sharingText} target="_blank"><img className={styles.icon} src="/twitter-white.svg" alt="Compartir en Twitter" />Compartir en Twitter</a></div>
                <div className={`${styles['social-media']} ${styles.linkedin}`}><a href={"http://www.linkedin.com/shareArticle?url=" + "https://turrero.vercel.app/turra/" + tweetId + "&title=" + encodeURI("La turra de @recuenco sobre " + categoriesAsText)} target="_blank"><img className={styles.icon} src="/linkedin-white.svg" alt="Compartir en Linkedin" />Compartir en Linkedin</a></div>
            </div>
        </div>
    }

    return <div className={styles['flex-right']}>
        {hasPodcast && <div className={styles['side-block']} id="podcast">
            <div className={styles['metadata-section']}>
                <img className={styles.icon} src="/volume-2.svg" alt="Escuchar en formato audio" />Escucha esta turra en formato podcast:
            </div>
            <div className={styles.player}>
                <audio controls>
                    <source src={"/podcast/" + tweetId + ".mp3"} type="audio/mpeg" />
                </audio>
            </div>
        </div>
        }
        {hideQuestions && !hasFailed && <ConfettiExplosion />}
        <div className={styles['side-block']}>
            {!books.length && !videos.length && !linkedin.length && !urls.length && !wikipedia.length && <div>No hay información adicional en esta turra.</div>}
            {!!videos.length && <div>
                <div className={styles['metadata-section']}><img className={styles.icon} src="/youtube.svg" alt="Enlaces a youtube" />Videos relacionados</div>
                {videos.map(metadata => <a key={metadata.id + "-video"} target="_blank" className={styles.related} href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!books.length && <div>
                <div className={styles['metadata-section']}><img className={styles.icon} src="/book.svg" alt="Enlaces a Goodreads" />Libros relacionados</div>
                {books.map(metadata => <a key={metadata.id + "-book"} target="_blank" className={styles.related} href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!linkedin.length && <div>
                <div className={styles['metadata-section']}><img className={styles.icon} src="/linkedin.svg" alt="Enlaces a Linkedin" />Artículos en linkedin relacionados</div>
                {linkedin.map(metadata => <a key={metadata.id + "-linkedin"} target="_blank" className={styles.related} href={metadata.url}>{metadata.title}</a>)}
            </div>}
            {!!wikipedia.length && <div>
                <div className={styles['metadata-section']}><img className={styles.icon} src="/wikipedia.svg" alt="Enlaces a Wikipedia" />Artículos de Wikipedia</div>
                {wikipedia.map((metadata, key) => <a key={key + "-wikipedia"} target="_blank" className={styles.related} href={metadata.url}>{metadata.url}</a>)}
            </div>}
            {!!urls.length && <div>
                <div className={styles['metadata-section']}><img className={styles.icon} src="/link.svg" alt="Índice de URLs" />Índice de URLs</div>
                {urls.map((url, key) => <a key={key + "-url"} target="_blank" className={styles.related} href={url}>{url}</a>)}
            </div>}
        </div>
        {printMode && !hideQuestions && <div className={styles['side-block']}><Sharing /></div>}
        {hasQuestions && !hideQuestions &&
            <div className={styles['side-block']}>
                <div className={styles.title}><img className={styles.icon} src="/book-open.svg" alt="Exámen de esta turra" />Pon en práctica tu comprensión</div>
                <div className={styles['sub-title']}>Lee detenidamente esta turra y contesta las preguntas para demostrar tus habilidades:</div>
                <div className={styles.questions} ref={questionsRef}>
                    {questions.map(({ question, options }, key) => <fieldset key={key + "-question"} className={styles.question}>
                        <div className={styles['question-title']}>{question}</div>
                        <ul>
                            {options.map((option, subKey) => <li key={subKey + "-option"} className={styles['question-option']}>
                                <label key={subKey + "-option"} className="radio">
                                    <input type="radio" className={styles['input-radio']} name={"option-" + key} value={subKey} />{option}
                                </label>
                            </li>)}
                        </ul>
                    </fieldset>)}
                </div>
                {hasFailed && <div className={styles.center}>
                    <span className={styles['failed-exam']}>Algunas o todas las respuestas son incorrectas.</span>
                    <br></br>
                    <span>¡Vuelve a intentarlo!</span>
                </div>}
                <div className={styles.center}>
                    <button className={styles.submitExam} onClick={checkExam}>Comprobar</button>
                </div>
            </div>}
        {hideQuestions && !hasFailed && <div className={styles['side-block']}>
            <div className={styles.center}>
                <div className={`${styles.title} ${styles.bold}`}>¡Has acertado todas las preguntas! ¿No serás @Recuenco?</div>
            </div>
            <Sharing />
        </div>}
    </div>;
}