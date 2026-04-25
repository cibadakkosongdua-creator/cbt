import { useEffect, useRef } from "react";
import katex from "katex";
import renderMathInElement from "katex/dist/contrib/auto-render";

// ===== UTILITY FUNCTIONS =====

// Render KaTeX in an element
export const renderMath = (element) => {
  if (!element) return;
  console.log('[renderMath] Called on element:', element.className, element.innerHTML?.substring(0, 100));
  try {
    // 1. Pre-process: Wrap standalone LaTeX commands that are NOT inside delimiters
    // This regex looks for common LaTeX commands like \frac, \sqrt, \times, etc.
    // that are not already wrapped in $ or \(
    const walkAndWrap = (node) => {
      if (node.nodeType === 3) { // Text node
        const text = node.textContent;
        // Regex to find \command{...}{...} or \command
        // Matches \frac{...}{...}, \sqrt{...}, \alpha, \times, etc.
        // The (?:\{[^{}]*\})* part captures ZERO or more {…} argument groups,
        // so \frac{1}{3} is matched as a whole instead of just \frac{1}.
        const latexRegex = /(\\[a-zA-Z]+(?:\{[^{}]*\})*)/g;
        
        // Check if it's already inside a delimiter in the parent's HTML (rough check)
        // A better way is to check if it's already rendered or in a .ql-formula
        if (node.parentElement && (
          node.parentElement.classList.contains('katex') || 
          node.parentElement.closest('.katex') ||
          node.parentElement.classList.contains('ql-formula')
        )) {
          return;
        }

        if (latexRegex.test(text)) {
          console.log('[walkAndWrap] Found LaTeX in text:', text);
          // Wrap with \( \) if not already wrapped
          // This is a simple heuristic: if the text contains \ but not $ or \(
          if (!text.includes('$') && !text.includes('\\(')) {
            const wrappedText = text.replace(latexRegex, (match) => `\\(${match}\\)`);
            if (wrappedText !== text) {
              console.log('[walkAndWrap] Wrapped:', text, '->', wrappedText);
              node.textContent = wrappedText;
            }
          }
        }
      } else if (node.nodeType === 1 && !node.classList.contains('katex')) {
        Array.from(node.childNodes).forEach(walkAndWrap);
      }
    };
    
    // Process text nodes to wrap naked LaTeX
    walkAndWrap(element);

    // 2. Render standard LaTeX with delimiters
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

    // 3. Render Quill formulas (class="ql-formula")
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
