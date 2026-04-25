import { useEffect, useRef } from "react";
import katex from "katex";
import renderMathInElement from "katex/dist/contrib/auto-render";

// ===== UTILITY FUNCTIONS =====

// Render KaTeX in an element
export const renderMath = (element) => {
  if (!element) return;
  try {
    // 1. Render standard LaTeX with delimiters
    renderMathInElement(element, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\begin{equation}", right: "\\end{equation}", display: true },
      ],
      throwOnError: false,
    });

    // 2. Render Quill formulas (class="ql-formula")
    const quillFormulas = element.querySelectorAll('.ql-formula');
    quillFormulas.forEach(formula => {
      const latex = formula.getAttribute('data-value') || formula.textContent;
      if (latex) {
        try {
          katex.render(latex, formula, {
            throwOnError: false,
            displayMode: formula.tagName === 'DIV'
          });
        } catch (e) {
          console.error("Quill formula render error:", e);
        }
      }
    });
  } catch (err) {
    console.error("KaTeX rendering error:", err);
  }
};

// Hook for rendering math in a component
export const useMath = (dependencies = []) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      renderMath(ref.current);
    }
  }, dependencies);
  return ref;
};

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
