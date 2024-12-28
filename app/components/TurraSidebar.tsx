'use client'
import { useState, useEffect } from 'react';
import { TweetExam } from '../../infrastructure/TweetProvider';
import Confetti from 'react-confetti';

interface TurraSidebarProps {
  exam?: TweetExam;
}

export function TurraSidebar({ exam }: TurraSidebarProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiOpacity, setConfettiOpacity] = useState(1);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  const handleAnswerSubmit = () => {
    if (selectedAnswer !== null) {
      setShowResult(true);
      
      if (exam && currentQuestion === exam.questions.length - 1 && 
          selectedAnswer === exam.questions[currentQuestion].answer - 1) {
        setShowConfetti(true);
      }
    }
  };

  useEffect(() => {
    if (showConfetti) {
      const fadeTimer = setTimeout(() => {
        setConfettiOpacity(0);
      }, 4000);

      const hideTimer = setTimeout(() => {
        setShowConfetti(false);
        setConfettiOpacity(1);
      }, 5000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [showConfetti]);

  const handleNextQuestion = () => {
    setCurrentQuestion(prev => prev + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  useEffect(() => {
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });

    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAnswerSelection = (index: number) => {
    setSelectedAnswer(index);
    setShowResult(false);
  };

  if (!exam) {
    return (
      <aside className="lg:col-span-4">
        <div className="top-4 space-y-4">
          {/* Books section remains unchanged */}
          <div className="bg-white border border-whiskey-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4 text-whiskey-900">
              Libros relacionados
            </h2>
            <ul className="list-disc list-inside space-y-3">
              <li className="flex flex-col">
                <a href="https://www.goodreads.com/book/show/28570175-the-fourth-industrial-revolution" className="group">
                  <h3 className="text-sm font-medium text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
                    The Fourth Industrial Revolution
                  </h3>
                  <p className="text-xs text-whiskey-700">Klaus Schwab</p>
                </a>
              </li>
              {/* ... other books ... */}
            </ul>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="lg:col-span-4">
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={true}
          numberOfPieces={500}
          gravity={0.1}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            zIndex: 50,
            opacity: confettiOpacity,
            transition: 'opacity 1s ease-out'
          }}
        />
      )}
      <div className="top-4 space-y-4">
        {/* Books section */}
        <div className="bg-white border border-whiskey-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4 text-whiskey-900">
            Libros relacionados
          </h2>
          <ul className="list-disc list-inside space-y-3">
            <li className="flex flex-col">
              <a href="https://www.goodreads.com/book/show/28570175-the-fourth-industrial-revolution" className="group">
                <h3 className="text-sm font-medium text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
                  The Fourth Industrial Revolution
                </h3>
                <p className="text-xs text-whiskey-700">Klaus Schwab</p>
              </a>
            </li>
            {/* ... other books ... */}
          </ul>
        </div>

        {/* Quiz Card */}
        <div className="bg-white border border-whiskey-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4 text-whiskey-900">
            Test de comprensión
          </h2>
          
          <div className="space-y-4">
            <p className="text-sm text-whiskey-800">
              Pregunta {currentQuestion + 1} de {exam.questions.length}
            </p>
            <p className="text-sm text-whiskey-800">
              {exam.questions[currentQuestion].question}
            </p>
            
            <div className="space-y-2">
              {exam.questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelection(index)}
                  className={`w-full text-left p-2 rounded text-sm flex items-center ${
                    selectedAnswer === index
                      ? 'bg-whiskey-100 text-whiskey-900'
                      : 'hover:bg-whiskey-50 text-whiskey-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    checked={selectedAnswer === index}
                    onChange={() => handleAnswerSelection(index)}
                    className="mr-2"
                  />
                  {option}
                </button>
              ))}
            </div>

            {showResult && (
              <div className={`p-3 rounded-lg text-sm ${
                selectedAnswer === exam.questions[currentQuestion].answer - 1
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {selectedAnswer === exam.questions[currentQuestion].answer - 1
                  ? '¡Correcto!'
                  : (
                    <>
                      <p>Incorrecto. Inténtalo de nuevo.</p>
                    </>
                  )}
              </div>
            )}

            <div className="space-y-2">
              {!showResult && (
                <button
                  onClick={handleAnswerSubmit}
                  disabled={selectedAnswer === null}
                  className="w-full py-2 px-4 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Comprobar respuesta
                </button>
              )}

              {showResult && currentQuestion < exam.questions.length - 1 && (
                <button
                  onClick={handleNextQuestion}
                  className="w-full py-2 px-4 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700"
                >
                  Siguiente pregunta
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
} 