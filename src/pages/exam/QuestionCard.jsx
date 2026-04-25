import React, { useEffect, useRef } from "react";
import { getQuestionTypeMeta } from "../../lib/uiMeta";
import AnswerArea from "./AnswerArea";
import { useMath } from "../../lib/utils";

const QuestionCard = ({ question, fontSize, doubtful, answers, setAnswers }) => {
  const containerRef = useMath([question, answers]);

  // Map fontSize to numeric values for AnswerArea
  const fontSizeMap = {
    "text-base": "text-sm",
    "text-lg": "text-base",
    "text-xl": "text-lg"
  };
  const answerFontSize = fontSizeMap[fontSize] || "text-base";

  if (!question) return null;
  const currentType = getQuestionTypeMeta(question.type);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_rgb(0,0,0,0.06)]"
    >
      {/* Top accent strip */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      <div className="p-5 md:p-7">
        {/* Question type + doubt badge */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className={`badge ${currentType.badgeClass}`}>
            {currentType.label || currentType.shortLabel}
          </span>
          {doubtful[question.id] && (
            <span className="badge badge-amber">
              <i className="fas fa-flag text-[10px] mr-1" />
              Ragu-ragu
            </span>
          )}
        </div>

        {/* Stimulus / reading text */}
        {question.stimulus && (
          <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-4 md:p-5">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-500">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100">
                <i className="fas fa-book-open text-[10px]" />
              </div>
              Teks Bacaan
            </div>
            <div
              className={`html-content leading-relaxed text-slate-700 ${fontSize}`}
              dangerouslySetInnerHTML={{ __html: typeof question.stimulus === 'object' ? (question.stimulus?.text || "") : String(question.stimulus || "") }}
            />
          </div>
        )}

        {/* Question image */}
        {question.image && typeof question.image === 'string' && question.image.trim() !== '' && (
          <div className="mb-5 flex justify-center">
            <img
              src={question.image}
              alt="Gambar soal"
              className="max-h-64 w-auto rounded-2xl border border-slate-200 object-contain shadow-sm"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        )}

        {/* Question text */}
        <div
          className={`html-content mb-6 font-semibold leading-relaxed text-slate-900 ${fontSize}`}
          dangerouslySetInnerHTML={{ __html: typeof question.question === 'object' ? (question.question?.text || "") : String(question.question || "") }}
        />

        {/* Answer area */}
        <div className="tour-answer">
          <AnswerArea question={question} answers={answers} setAnswers={setAnswers} fontSize={answerFontSize} />
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
