// src/MemoryMatchGame.js
import React, { useState, useEffect } from 'react';

const EMOJIS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍑', '🍒', '🥝'];

const MemoryMatchGame = ({ userId, onGameEnd }) => {
  const [cards, setCards] = useState([]);
  const [flippedIndexes, setFlippedIndexes] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [difficulty, setDifficulty] = useState('Easy');

  const initGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji, isFlipped: false, matched: false }));
    setCards(shuffled);
    setFlippedIndexes([]);
    setMatchedPairs([]);
    setMoves(0);
    setTimer(0);
    setIsFinished(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    if (isFinished || matchedPairs.length === EMOJIS.length) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished, matchedPairs]);

  useEffect(() => {
    if (flippedIndexes.length === 2) {
      const [first, second] = flippedIndexes;
      const card1 = cards[first];
      const card2 = cards[second];

      if (card1.emoji === card2.emoji) {
        setMatchedPairs((prev) => [...prev, card1.emoji]);
        setCards((prev) =>
          prev.map((card, idx) =>
            idx === first || idx === second ? { ...card, matched: true } : card
          )
        );
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card, idx) =>
              idx === first || idx === second ? { ...card, isFlipped: false } : card
            )
          );
        }, 1000);
      }
      setFlippedIndexes([]);
      setMoves((prev) => prev + 1);
    }
  }, [flippedIndexes, cards]);

  const handleCardClick = (index) => {
    if (isFinished) return;
    if (flippedIndexes.length === 2) return;
    if (cards[index].matched) return;
    if (flippedIndexes.includes(index)) return;

    setCards((prev) =>
      prev.map((card, idx) =>
        idx === index ? { ...card, isFlipped: true } : card
      )
    );
    setFlippedIndexes((prev) => [...prev, index]);
  };

  const finishGame = async () => {
    if (isFinished) return;
    setIsFinished(true);

    const totalPairs = EMOJIS.length;
    const score = Math.round((matchedPairs.length / totalPairs) * 100);

    const payload = {
      user_id: userId,
      game_id: 'memory_match',
      difficulty: difficulty,
      score: score,
      time_taken: timer,
    };

    try {
      const response = await fetch('https://smriti-setu-sih-1.onrender.com/api/save_game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log('Memory Match Score Saved:', data);
    } catch (error) {
      console.error('Error saving game:', error);
    }

    setTimeout(() => {
      onGameEnd();
    }, 2000);
  };

  useEffect(() => {
    if (matchedPairs.length === EMOJIS.length && !isFinished) {
      finishGame();
    }
  }, [matchedPairs]);

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>🧠 Memory Match</h2>
        <div className="game-stats">
          <span>⏱️ {timer}s</span>
          <span>🔄 {moves} moves</span>
          <span>✅ {matchedPairs.length}/{EMOJIS.length} pairs</span>
          <span>📊 Score: {matchedPairs.length > 0 ? Math.round((matchedPairs.length / EMOJIS.length) * 100) : 0}%</span>
        </div>
        <div className="difficulty-selector">
          <button className={difficulty === 'Easy' ? 'active' : ''} onClick={() => setDifficulty('Easy')}>Easy</button>
          <button className={difficulty === 'Medium' ? 'active' : ''} onClick={() => setDifficulty('Medium')}>Medium</button>
          <button className={difficulty === 'Hard' ? 'active' : ''} onClick={() => setDifficulty('Hard')}>Hard</button>
          <button className="reset-btn" onClick={initGame}>🔄 New Game</button>
        </div>
      </div>

      <div className="memory-grid">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`memory-card ${card.isFlipped || card.matched ? 'flipped' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <div className="card-inner">
              <div className="card-front">{card.emoji}</div>
              <div className="card-back">❓</div>
            </div>
          </div>
        ))}
      </div>

      {isFinished && (
        <div className="game-over-overlay">
          <h2>🎉 Game Over!</h2>
          <p>Score: {Math.round((matchedPairs.length / EMOJIS.length) * 100)}%</p>
          <p>Time: {timer}s</p>
        </div>
      )}
    </div>
  );
};

export default MemoryMatchGame;