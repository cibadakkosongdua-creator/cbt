// ===== SCORING & PASSWORD FUNCTIONS =====

// Scoring function
export const calculateScore = (answers, questions, config = {}) => {
  let correct = 0;
  let total = questions.length;

  questions.forEach((q) => {
    const userAnswer = answers[q.id];
    if (!userAnswer && userAnswer !== 0) return; // Skip jika tidak dijawab

    if (q.type === "PG") {
      // Normalize both to strings for safe comparison
      let normalizedAnswer = q.answer !== undefined && q.answer !== null ? String(q.answer).trim() : "";
      let normalizedUser = userAnswer !== undefined && userAnswer !== null ? String(userAnswer).trim() : "";

      if (normalizedAnswer === "") return; // Kunci jawaban kosong

      // Cek apakah kunci jawaban berupa huruf (A-E)
      const isLetterAnswer = /^[A-E]$/i.test(normalizedAnswer);
      if (isLetterAnswer) {
        const userLetter = String.fromCharCode(65 + Number(userAnswer));
        if (userLetter.toUpperCase() === normalizedAnswer.toUpperCase()) correct++;
      } else {
        // Bandingkan sebagai angka (indeks 0, 1, 2...)
        if (Number(normalizedUser) === Number(normalizedAnswer)) correct++;
      }
    } else if (q.type === "PGK") {
      const answerArray = Array.isArray(userAnswer) ? userAnswer : [];
      const correctArray = Array.isArray(q.answer) ? q.answer : [];

      if (config.partialScoringPGK === true) {
        if (correctArray.length > 0) {
          // Benar yang dipilih
          const correctlySelected = answerArray.filter((opt) =>
            correctArray.some(c => String(c) === String(opt)),
          ).length;
          
          // Salah yang dipilih (penalti)
          const wronglySelected = answerArray.filter((opt) =>
            !correctArray.some(c => String(c) === String(opt)),
          ).length;
          
          // Skor = (Benar - Salah) / Total Benar (minimal 0)
          const rawPartial = (correctlySelected - wronglySelected) / correctArray.length;
          const partialScore = Math.max(0, rawPartial);
          correct += partialScore;
        }
      } else {
        // All-or-nothing: semua pilihan harus tepat
        const sortedUser = [...answerArray].map(String).sort();
        const sortedCorrect = [...correctArray].map(String).sort();
        
        if (
          sortedUser.length > 0 && // Ensure user actually picked something for non-empty answers
          JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect)
        ) {
          correct++;
        }
      }
    } else if (q.type === "ISIAN") {
      // Case insensitive & trim
      if (userAnswer?.toLowerCase().trim() === q.answer?.toLowerCase().trim()) {
        correct++;
      }
    } else if (q.type === "JODOH") {
      // Jodoh - semua pasangan harus dipilih dengan benar (idx: idx)
      const allCorrect = q.pairs?.every((_, idx) => userAnswer[idx] === idx);
      if (allCorrect) correct++;
    } else if (q.type === "BS") {
      // Benar/Salah - check setiap statement
      const allCorrect = q.statements?.every(
        (stmt, idx) => userAnswer[idx] === stmt.isTrue,
      );
      if (allCorrect) correct++;
    }
  });

  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { score, correct: Math.round(correct * 100) / 100, total };
};

// Simple password hashing menggunakan crypto (basic)
export const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

// Verify password
export const verifyPassword = async (password, hash) => {
  const newHash = await hashPassword(password);
  return newHash === hash;
};
