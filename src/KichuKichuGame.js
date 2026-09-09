// src/KichuKichuGame.js
import React, { useState, useEffect } from 'react';

const QUESTIONS = [
  { question: "Which is a famous dance of Assam?", options: ["Bihu", "Kathak", "Bharatanatyam", "Odissi"], correct: 0 },
  { question: "Which is a traditional food from the Northeast?", options: ["Dosa", "Khar", "Pizza", "Burger"], correct: 1 },
  { question: "What is the capital of Assam?", options: ["Guwahati", "Dispur", "Shillong", "Aizawl"], correct: 1 },
  { question: "Which festival is celebrated in Meghalaya?", options: ["Bihu", "Wangala", "Lohri", "Pongal"], correct: 1 },
  { question: "Which is a famous river in the Northeast?", options: ["Ganga", "Brahmaputra", "Yamuna", "Godavari"], correct: 1 },
];

const KichuKichuGame = ({ userId, onGameEnd }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAnswer = (selectedIndex) => {
    if (isFinished) return;
    const isCorrect = selectedIndex === QUESTIONS[currentQuestion].correct;
    if (isCorrect) setScore((prev) => prev + 1);

    if (currentQuestion + 1 < QUESTIONS.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    if (isFinished) return;
    setIsFinished(true);

    const finalScore = Math.round((score / QUESTIONS.length) * 100);
    const payload = {
      user_id: userId,                    // ✅ dynamic user ID
      game_id: 'kichu_kichu_tambulam',
      difficulty: 'Easy',
      score: finalScore,
      time_taken: timer,
    };

    try {
      await fetch('https://smriti-setu-sih-1.onrender.com/api/save_kichu_kichu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error saving Kichu Kichu:', error);
    }

    setTimeout(() => {
      onGameEnd();
    }, 2000);
  };

  if (isFinished) {
    return (
      <div className="game-over-overlay">
        <h2>🎉 Kichu Kichu Done!</h2>
        <p>Score: {Math.round((score / QUESTIONS.length) * 100)}%</p>
        <p>Time: {timer}s</p>
        <button onClick={() => onGameEnd()}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="game-container">
      <h2>🎭 Kichu Kichu Tambulam</h2>
      <div className="game-stats">
        <span>⏱️ {timer}s</span>
        <span>📊 {score}/{QUESTIONS.length}</span>
      </div>
      <div className="question-box">
        <h3>{QUESTIONS[currentQuestion].question}</h3>
        <div className="options-grid">
          {QUESTIONS[currentQuestion].options.map((option, idx) => (
            <button key={idx} className="option-btn" onClick={() => handleAnswer(idx)}>
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KichuKichuGame;
