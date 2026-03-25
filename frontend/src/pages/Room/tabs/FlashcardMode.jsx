import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Shuffle, CheckCircle } from 'lucide-react';

export default function FlashcardMode({ questions, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [shuffled, setShuffled] = useState(false);
  const [cardOrder, setCardOrder] = useState(questions.map((_, i) => i));

  const currentQ = questions[cardOrder[currentIndex]];
  const total = questions.length;
  const remaining = total - knownCards.size;

  const flipCard = () => setIsFlipped(!isFlipped);

  const nextCard = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 150);
  }, [total]);

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + total) % total);
    }, 150);
  }, [total]);

  const markKnown = () => {
    const newKnown = new Set(knownCards);
    const actualIdx = cardOrder[currentIndex];
    if (newKnown.has(actualIdx)) {
      newKnown.delete(actualIdx);
    } else {
      newKnown.add(actualIdx);
    }
    setKnownCards(newKnown);
  };

  const shuffleCards = () => {
    const newOrder = [...cardOrder];
    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    setCardOrder(newOrder);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShuffled(true);
  };

  const resetCards = () => {
    setCardOrder(questions.map((_, i) => i));
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setShuffled(false);
  };

  const LETTERS = ['A', 'B', 'C', 'D'];
  const isKnown = knownCards.has(cardOrder[currentIndex]);

  return (
    <div className="flashcard-mode animate-fade-in">
      {/* Header */}
      <div className="flashcard-header">
        <button className="btn btn-ghost btn-icon" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <div className="flashcard-progress-info">
          <span>{currentIndex + 1} / {total}</span>
          <span className="flashcard-known-count">
            <CheckCircle size={14} style={{ marginRight: 4 }} />
            Đã thuộc: {knownCards.size}/{total}
          </span>
        </div>
        <div className="flashcard-actions">
          <button className="btn btn-ghost btn-sm" onClick={shuffleCards} title="Xáo trộn">
            <Shuffle size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={resetCards} title="Đặt lại">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flashcard-progress-bar">
        <div
          className="flashcard-progress-fill"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="flashcard-container" onClick={flipCard}>
        <div className={`flashcard ${isFlipped ? 'flipped' : ''} ${isKnown ? 'known' : ''}`}>
          {/* Front - Question */}
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-label">Câu {currentIndex + 1}</div>
            <div className="flashcard-question">{currentQ.question}</div>
            <div className="flashcard-hint">Nhấn để xem đáp án</div>
          </div>

          {/* Back - Answer */}
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-label">Đáp án</div>
            <div className="flashcard-answer">
              <div className="flashcard-correct-answer">
                <span className="correct-letter">{LETTERS[currentQ.correctIndex]}</span>
                <span>{currentQ.options[currentQ.correctIndex]}</span>
              </div>
              {currentQ.explanation && (
                <div className="flashcard-explanation">
                  💡 {currentQ.explanation}
                </div>
              )}
            </div>
            <div className="flashcard-all-options">
              {currentQ.options.map((opt, i) => (
                <div
                  key={i}
                  className={`flashcard-option ${i === currentQ.correctIndex ? 'correct' : ''}`}
                >
                  <span className="option-letter-mini">{LETTERS[i]}</span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flashcard-controls">
        <button className="btn btn-secondary btn-icon" onClick={prevCard} title="Trước">
          <ArrowLeft size={20} />
        </button>

        <button
          className={`btn ${isKnown ? 'btn-success' : 'btn-secondary'} flashcard-mark-btn`}
          onClick={(e) => { e.stopPropagation(); markKnown(); }}
        >
          <CheckCircle size={18} />
          <span>{isKnown ? 'Đã thuộc' : 'Đánh dấu thuộc'}</span>
        </button>

        <button className="btn btn-secondary btn-icon" onClick={nextCard} title="Sau">
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Completed message */}
      {knownCards.size === total && (
        <div className="flashcard-completed animate-fade-in-up">
          <h3>🎉 Tuyệt vời!</h3>
          <p>Bạn đã thuộc tất cả {total} câu! Nhấn đặt lại để ôn tiếp.</p>
        </div>
      )}
    </div>
  );
}
