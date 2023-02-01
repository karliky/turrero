import { useRef, useState } from "react";
import ConfettiExplosion from 'react-confetti-explosion';

const ExamQuestions = require("../db/tweets_exam.json");

export default function ({ books, videos, linkedin, urls, wikipedia, summary, categories, tweetId }) {
    const { questions } = ExamQuestions.find(({ id }) => id === tweetId);
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
        const correctAnswers = ExamQuestions.find((({id}) => id === tweetId)).questions.map(({ options, answer }) => options.map((_, index) => index + 1 === answer)).flat();
        const result = JSON.stringify(answers) === JSON.stringify(correctAnswers);
        setHasFailed(!result);
        setHideQuestions(result);
    };

    const Sharing = () => {
        return <div className='side-block'>
            <div>Dale la turra a más gente:</div>
            <div className="sharing">
                <div className="social-media twitter"><a href={"https://twitter.com/intent/tweet?text=" + sharingText} target="_blank"><img className="icon" src="/twitter-white.svg" alt="Compartir en Twitter" />Compartir en Twitter</a></div>
                <div className="social-media linkedin"><a href={"http://www.linkedin.com/shareArticle?url=" + "https://turrero.vercel.app/turra/" + tweetId + "&title=" + encodeURI("La turra de @recuenco sobre " + categoriesAsText)} target="_blank"><img className="icon" src="/linkedin-white.svg" alt="Compartir en Linkedin" />Compartir en Linkedin</a></div>
            </div>
        </div>
    }

    return <div className='flex-right'>
        {hideQuestions && !hasFailed && <ConfettiExplosion />}
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
        {!hideQuestions && <Sharing />}
        {hasQuestions && !hideQuestions &&
            <div className='side-block'>
                <div className="title"><img className="icon" src="/book-open.svg" alt="Exámen de esta turra" />Pon en práctica tu comprensión:</div>
                <div className="sub-title">Lee detenidamente esta turra y contesta las preguntas para demostrar tus habilidades:</div>
                <div className="questions" ref={questionsRef}>
                    {questions.map(({ question, options }, key) => <fieldset key={key + "-question"} className="question">
                        <div className="question-title">{question}</div>
                        <ul>
                            {options.map((option, subKey) => <li key={subKey + "-option"} className="question-option">
                                <label key={subKey + "-option"} className="radio">
                                    <input type="radio" name={"option-" + key} value={subKey} />{option}
                                </label>
                            </li>)}
                        </ul>
                    </fieldset>)}
                </div>
                {hasFailed && <div className="center">
                    <span className="failed-exam">Algunas o todas las respuestas son incorrectas.</span>
                    <br></br>
                    <span>¡Vuelve a intentarlo!</span>
                </div>}
                <div className="center">
                    <button className="submitExam" onClick={checkExam}>Comprobar</button>
                </div>
            </div>}
        {hideQuestions && !hasFailed && <div className='side-block'>
            <div className="center">
                <div className="title bold">¡Has acertado todas las preguntas! ¿No serás @Recuenco?</div>
            </div>
            <Sharing />
        </div>}
        <style jsx>
            {`
            .title {
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                color: #191817;
            }
            .bold {
                font-weight: bold;
            }
            .title img {
                margin-right: 5px;
            }
            .sub-title {
                font-size: 0.8em;
                line-height: 1.2em;
            }
            .questions {
                font-size: 0.8em;
                padding: 5px;
            }
            .question-title {
                font-weight: bold;
                margin-top: 8px;
                line-height: 1.3em;
                display: inline-block;
            }
            .question-option {
                display: block;
                padding-left: 10px;
                padding-right: 5px;
            }
            input[type=radio] {
                accent-color : #a5050b;
            }
            .failed-exam {
                color : #a5050b;
            }
            .submitExam {
                background-color: transparent;
                border: 1px solid #a5050b;
                color: #a5050b;
                padding: 12px 28px;
                margin-top: 8px;
                text-decoration: none;
                display: inline-block;
                font-size: 16px;
                cursor: pointer;
            }
            .submitExam:hover {
                background-color: #a5050b;
                color: white;
            }
            .center {
                text-align: center;
            }
      `}
        </style>
    </div>;
}