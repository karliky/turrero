'use client'
import { useState, useEffect } from 'react';
import { TweetExam } from '../../infrastructure/TweetProvider';
import Confetti from 'react-confetti';

interface TurraExamProps {
  exam: TweetExam;
}

export function TurraExam({ exam }: TurraExamProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
    setShowResults(false);
    setShowConfetti(false);
  };

  const handleCheckResults = () => {
    if (selectedAnswers.length !== exam.questions.length) {
      alert('Por favor, responde todas las preguntas antes de comprobar los resultados');
      return;
    }

    const allCorrect = exam.questions.every((q, idx) => 
      selectedAnswers[idx] === q.answer
    );

    if (allCorrect) {
      setShowConfetti(true);
    } else {
      const firstWrongQuestionIndex = exam.questions.findIndex((q, idx) => 
        selectedAnswers[idx] !== q.answer
      );
      const questionElement = document.querySelector(`[data-question-index="${firstWrongQuestionIndex}"]`);
      questionElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setShowResults(true);
  };

  return (
    <div>
      {showConfetti && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            gravity={0.1}
            numberOfPieces={500}
            tweenDuration={8000}
            confettiSource={{
              x: 0,
              y: 0,
              w: windowSize.width,
              h: 0
            }}
          />
        </div>
      )}
      
      <div className="space-y-6 bg-white/50 backdrop-blur-sm p-6 rounded-lg border border-whiskey-200 shadow-sm">
        <h2 className="text-2xl font-bold text-whiskey-900">¿Cuánto has aprendido?</h2>
        <div className="space-y-8">
          {exam.questions.map((question, qIndex) => (
            <div 
              key={qIndex} 
              className="space-y-4"
              data-question-index={qIndex}
            >
              <p className="font-medium text-whiskey-800 text-lg">{question.question}</p>
              <div className="space-y-3">
                {question.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleAnswerSelect(qIndex, oIndex)}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 border ${
                      selectedAnswers[qIndex] === oIndex
                        ? showResults
                          ? selectedAnswers[qIndex] === question.answer
                            ? 'bg-green-100 border-green-500 text-green-900'
                            : 'bg-red-100 border-red-500 text-red-900'
                          : 'bg-whiskey-200 border-whiskey-400 text-whiskey-900'
                        : 'bg-white border-whiskey-200 text-whiskey-700 hover:bg-whiskey-50 hover:border-whiskey-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {showResults && selectedAnswers[qIndex] !== question.answer && (
                <p className="text-red-600 text-sm mt-2">
                  Opción incorrecta.
                </p>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleCheckResults}
          className={`w-full mt-6 py-3 px-4 rounded-lg transition-colors ${
            showResults 
              ? 'bg-whiskey-800 text-white hover:bg-whiskey-900'
              : 'bg-whiskey-600 text-white hover:bg-whiskey-700'
          }`}
        >
          Comprobar resultados
        </button>
      </div>
    </div>
  );
} 