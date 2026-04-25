import { useLayoutEffect, useRef } from "react";
import katex from "katex";
import renderMathInElement from "katex/dist/contrib/auto-render";

// ===== UTILITY FUNCTIONS =====

// Render KaTeX in an element
export const renderMath = (element) => {
  if (!element) return;
  console.log('[renderMath] Called on element:', element.className, element.innerHTML?.substring(0, 100));
  try {
    // 1. Pre-process: Find and render standalone LaTeX commands directly
    // This is more reliable than wrapping with delimiters
    const walkAndRender = (node) => {
      if (node.nodeType === 3) { // Text node
        const text = node.textContent;
        // Regex to find \command{...}{...} or \command
        const latexRegex = /(\\[a-zA-Z]+(?:\{[^{}]*\})*)/g;
        
        // Check if it's already inside a rendered element
        if (node.parentElement && (
          node.parentElement.classList.contains('katex') || 
          node.parentElement.closest('.katex') ||
          node.parentElement.classList.contains('ql-formula')
        )) {
          return;
        }

        if (latexRegex.test(text)) {
          console.log('[walkAndRender] Found LaTeX in text:', text);
          // Reset lastIndex after test() so matchAll() works correctly
          latexRegex.lastIndex = 0;
          // Render each match directly using katex.render
          const matches = [...text.matchAll(latexRegex)];
          console.log('[walkAndRender] Matches:', matches);
          if (matches.length > 0) {
            // Create a document fragment to hold the result
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            
            matches.forEach((match) => {
              // Add text before the match
              if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
              }
              
              // Create a span for the rendered math
              const span = document.createElement('span');
              try {
                katex.render(match[0], span, {
                  throwOnError: false,
                  displayMode: false
                });
                console.log('[walkAndRender] Rendered:', match[0]);
              } catch (e) {
                console.error('[walkAndRender] Render error:', e);
                span.textContent = match[0]; // Fallback to raw text
              }
              fragment.appendChild(span);
              lastIndex = match.index + match[0].length;
            });
            
            // Add remaining text
            if (lastIndex < text.length) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
            
            // Replace the text node with the fragment
            node.parentNode.replaceChild(fragment, node);
          }
        }
      } else if (node.nodeType === 1 && !node.classList.contains('katex')) {
        Array.from(node.childNodes).forEach(walkAndRender);
      }
    };
    
    // Process text nodes to render naked LaTeX directly
    walkAndRender(element);

    console.log('[renderMath] After walkAndRender, HTML (first 500 chars):', element.innerHTML?.substring(0, 500));

    // 2. Render standard LaTeX with delimiters (for any that were already wrapped)
    console.log('[renderMath] Calling renderMathInElement...');
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
    console.log('[renderMath] renderMathInElement completed');

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
  
  useLayoutEffect(() => {
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
