import React, { useRef, useEffect, memo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const RichTextEditor = memo(({ value, onChange, placeholder, modules, className }) => {
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

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value || ""}
      onChange={handleChange}
      placeholder={placeholder}
      modules={modules}
      className={className}
    />
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
