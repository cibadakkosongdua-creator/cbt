// ===== UTILITY FUNCTIONS =====

// Shuffle array menggunakan Fisher-Yates
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Format time
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Generate exam session ID
export const generateExamId = () => {
  return `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
