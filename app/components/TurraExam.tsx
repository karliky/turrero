'use client';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import type { ExamQuestion } from '@/lib/types';

const LETTERS = ['A', 'B', 'C', 'D'];

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed';

const OPTION_STYLES: Record<OptionState, { box: string; badge: string }> = {
  idle: { box: 'border-whiskey-200 bg-surface hover:border-whiskey-400', badge: 'border-whiskey-300 text-whiskey-800' },
  selected: { box: 'border-whiskey-900 bg-whiskey-50', badge: 'border-whiskey-900 bg-whiskey-900 text-whiskey-50' },
  correct: { box: 'border-ok bg-ok-soft', badge: 'border-ok bg-ok text-surface' },
  wrong: { box: 'border-bad bg-bad-soft', badge: 'border-bad bg-bad text-surface' },
  // The right answer, shown after a wrong one
  missed: { box: 'border-ok border-dashed bg-surface', badge: 'border-ok text-ok' },
};

export function TurraExam({ questions }: { questions: ExamQuestion[] }): React.ReactElement {
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [checked, setChecked] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!confetti) return undefined;
    const timer = setTimeout(() => setConfetti(false), 10000);
    return () => clearTimeout(timer);
  }, [confetti]);

  const answered = questions.filter((_, index) => answers[index] !== undefined).length;
  const score = questions.filter((question, index) => answers[index] === question.answer).length;

  const choose = (question: number, option: number) => {
    const next = [...answers];
    next[question] = option;
    setAnswers(next);
    setChecked(false);
    setConfetti(false);
  };

  const check = () => {
    setChecked(true);
    if (score === questions.length) setConfetti(true);
  };

  const stateOf = (question: ExamQuestion, index: number, option: number): OptionState => {
    const chosen = answers[index] === option;
    if (!checked) return chosen ? 'selected' : 'idle';
    if (chosen) return option === question.answer ? 'correct' : 'wrong';
    return option === question.answer && answers[index] !== question.answer ? 'missed' : 'idle';
  };

  return (
    <section className="rounded-xl border border-whiskey-200 border-t-[3px] border-t-brand bg-surface p-5 shadow-sm">
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <Confetti
            width={size.width}
            height={size.height}
            recycle={false}
            gravity={0.1}
            numberOfPieces={500}
            tweenDuration={8000}
            confettiSource={{ x: 0, y: 0, w: size.width, h: 0 }}
          />
        </div>
      )}

      <h2 className="font-serif text-xl font-bold text-whiskey-950">¿Cuánto has aprendido?</h2>
      <p className="mt-1 text-sm text-whiskey-800">
        {questions.length} preguntas sobre esta turra.
      </p>

      <ol className="mt-5 space-y-6">
        {questions.map((question, qIndex) => (
          <li key={qIndex}>
            <p className="flex gap-2 font-medium leading-snug text-whiskey-950">
              <span className="font-serif font-bold text-brand">{qIndex + 1}.</span>
              {question.question}
            </p>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label={question.question}>
              {question.options.map((option, oIndex) => {
                const state = stateOf(question, qIndex, oIndex);
                return (
                  <button
                    key={oIndex}
                    type="button"
                    role="radio"
                    aria-checked={answers[qIndex] === oIndex}
                    onClick={() => choose(qIndex, oIndex)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-2.5 text-left text-sm leading-snug text-whiskey-950 transition-colors ${OPTION_STYLES[state].box}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${OPTION_STYLES[state].badge}`}
                    >
                      {LETTERS[oIndex]}
                    </span>
                    <span className="pt-0.5">{option}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {checked && (
        <p className="mt-6 rounded-lg bg-whiskey-50 p-3 text-center text-sm font-medium text-whiskey-950" aria-live="polite">
          {score === questions.length
            ? `Has acertado las ${questions.length}.`
            : `Has acertado ${score} de ${questions.length}. La correcta está marcada con borde verde.`}
        </p>
      )}

      <button
        type="button"
        onClick={check}
        disabled={answered < questions.length}
        className="mt-4 w-full rounded-lg bg-whiskey-900 px-4 py-3 font-semibold text-whiskey-50 transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:bg-whiskey-200 disabled:text-whiskey-800"
      >
        {answered < questions.length ? `Responde las ${questions.length} preguntas (${answered}/${questions.length})` : 'Comprobar respuestas'}
      </button>
    </section>
  );
}
