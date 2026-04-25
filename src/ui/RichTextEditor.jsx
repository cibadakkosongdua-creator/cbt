import React, { useRef, useEffect, memo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const RichTextEditor = memo(({ value, onChange, placeholder, modules, className, showLatexToolbar = false }) => {
  const quillRef = useRef(null);

  // Use a ref to store the latest value from the parent to avoid unnecessary updates
  const lastValueRef = useRef(value);

  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  const handleChange = (content, delta, source, editor) => {
    if (source === 'user') {
      const newValue = content === '<p><br></p>' ? '' : content;
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    }
  };

  const insertLatex = (latex) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      editor.insertText(range.index, latex);
      editor.setSelection(range.index + latex.length);
    }
  };

  const latexButtons = [
    { label: "Pecahan", latex: "\\frac{?}{?}", icon: "÷" },
    { label: "Akar", latex: "\\sqrt{?}", icon: "√" },
    { label: "Pangkat", latex: "^{?}", icon: "x²" },
    { label: "Subscript", latex: "_{?}", icon: "x₂" },
    { label: "Sigma", latex: "\\sum", icon: "∑" },
    { label: "Pi", latex: "\\pi", icon: "π" },
    { label: "Alpha", latex: "\\alpha", icon: "α" },
    { label: "Beta", latex: "\\beta", icon: "β" },
    { label: "Theta", latex: "\\theta", icon: "θ" },
    { label: "Lebih dari", latex: ">", icon: ">" },
    { label: "Kurang dari", latex: "<", icon: "<" },
    { label: "Sama dengan", latex: "=", icon: "=" },
  ];

  return (
    <div>
      {showLatexToolbar && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 self-center mr-2">LaTeX:</span>
          {latexButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => insertLatex(btn.latex)}
              className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:border-slate-400 transition"
              title={btn.label}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      )}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        className={className}
      />
    </div>
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
