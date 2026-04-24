import React from "react";
import { playSound } from "../../lib/soundUtils";

const AnswerArea = ({ question, answers, setAnswers }) => {
  const currentQ = question;
  if (!currentQ) return null;

  if (currentQ.type === "PG") {
    return (
      <div className="space-y-3">
        {currentQ.options?.map((opt, idx) => {
          const originalIdx = typeof opt === 'object' && opt !== null ? opt.originalIdx : idx;
          const selected = answers[currentQ.id] === originalIdx;
          const label = String.fromCharCode(65 + idx);

          return (
            <button
              key={idx}
              onClick={() => setAnswers({ ...answers, [currentQ.id]: originalIdx })}
              className={`group flex w-full items-center gap-3 sm:gap-4 rounded-2xl border-2 p-3 sm:p-4 text-left transition-all duration-200 ${
                selected
                  ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-lg shadow-indigo-100"
                  : "border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50 active:scale-[0.98]"
              }`}
            >
              <div
                className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-base sm:text-lg font-black transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                }`}
              >
                {label}
              </div>
              <div
                className={`flex-1 text-sm sm:text-[15px] font-semibold leading-relaxed ${
                  selected ? "text-indigo-900" : "text-slate-600"
                }`}
                dangerouslySetInnerHTML={{ __html: typeof opt === 'object' && opt !== null ? (opt.text || "") : String(opt || "") }}
              />
              {selected && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                  <i className="fas fa-circle-check text-indigo-500 text-sm" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (currentQ.type === "PGK") {
    const selectedOptions = Array.isArray(answers[currentQ.id])
      ? answers[currentQ.id]
      : [];

    const toggleOption = (originalIdx) => {
      if (selectedOptions.includes(originalIdx)) {
        setAnswers({
          ...answers,
          [currentQ.id]: selectedOptions.filter((o) => o !== originalIdx),
        });
      } else {
        setAnswers({
          ...answers,
          [currentQ.id]: [...selectedOptions, originalIdx],
        });
      }
    };

    return (
      <div className="space-y-3">
        {currentQ.options?.map((opt, idx) => {
          const originalIdx = typeof opt === 'object' && opt !== null ? opt.originalIdx : idx;
          const selected = selectedOptions.includes(originalIdx);
          const label = String.fromCharCode(65 + idx);

          return (
            <button
              key={idx}
              onClick={() => toggleOption(originalIdx)}
              className={`group flex w-full items-center gap-3 sm:gap-4 rounded-2xl border-2 p-3 sm:p-4 text-left transition-all duration-200 ${
                selected
                  ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-lg shadow-indigo-100"
                  : "border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50 active:scale-[0.98]"
              }`}
            >
              <div
                className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-base sm:text-lg font-black transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                }`}
              >
                {selected ? <i className="fas fa-check" /> : label}
              </div>
              <div
                className={`flex-1 text-sm sm:text-[15px] font-semibold leading-relaxed ${
                  selected ? "text-indigo-900" : "text-slate-600"
                }`}
                dangerouslySetInnerHTML={{ __html: typeof opt === 'object' && opt !== null ? (opt.text || "") : String(opt || "") }}
              />
            </button>
          );
        })}
      </div>
    );
  }

  /* ── ISIAN — Free text ── */
  if (currentQ.type === "ISIAN") {
    return (
      <textarea
        className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition resize-none"
        rows={4}
        placeholder="Ketik jawaban di sini..."
        value={answers[currentQ.id] || ""}
        onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
      />
    );
  }

  /* ── JODOH — Matching ── */
  if (currentQ.type === "JODOH") {
    return (
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Klik setiap baris untuk mengonfirmasi pasangan:
        </p>
        {currentQ.pairs?.map((pair, idx) => {
          const isConfirmed = answers[currentQ.id]?.[idx] === idx;
          return (
            <button
              key={idx}
              onClick={() => {
                playSound("pop");
                const userAnswer = answers[currentQ.id] || {};
                setAnswers({
                  ...answers,
                  [currentQ.id]: { ...userAnswer, [idx]: isConfirmed ? null : idx },
                });
              }}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                isConfirmed
                  ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md shadow-emerald-100"
                  : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
                  isConfirmed ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {isConfirmed ? <i className="fas fa-check text-xs" /> : idx + 1}
              </div>
              <div className="flex flex-1 items-center gap-3">
                <div
                  className="flex-1 html-content text-sm font-medium text-slate-800"
                  dangerouslySetInnerHTML={{ __html: typeof pair.left === 'object' && pair.left !== null ? (pair.left.text || "") : String(pair.left || "") }}
                />
                <i className="fas fa-arrows-left-right text-xs text-slate-300 shrink-0" />
                <div
                  className="flex-1 html-content text-sm text-slate-600"
                  dangerouslySetInnerHTML={{ __html: typeof pair.right === 'object' && pair.right !== null ? (pair.right.text || "") : String(pair.right || "") }}
                />
              </div>
            </button>
          );
        })}
        <button
          onClick={() => {
            playSound("click");
            setAnswers({ ...answers, [currentQ.id]: {} });
          }}
          className="text-xs font-semibold text-slate-400 hover:text-red-500 transition flex items-center gap-1"
        >
          <i className="fas fa-rotate-left" />
          Reset semua
        </button>
      </div>
    );
  }

  /* ── BS — Benar / Salah ── */
  if (currentQ.type === "BS") {
    const setBSAnswer = (idx, value) => {
      playSound("pop");
      setAnswers((prev) => ({
        ...prev,
        [currentQ.id]: { ...(prev[currentQ.id] || {}), [idx]: value },
      }));
    };

    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="md:hidden border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400">
          <i className="fas fa-hand-pointer mr-1" />
          Geser tabel ke samping jika diperlukan
        </div>
        <div className="min-w-[500px]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_96px_96px] border-b border-slate-100 bg-slate-50">
            <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Pernyataan</div>
            <div className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-600">Benar</div>
            <div className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-red-500">Salah</div>
          </div>

          {currentQ.statements?.map((stmt, idx) => {
            const selected = answers[currentQ.id]?.[idx];
            const isBenar  = selected === true;
            const isSalah  = selected === false;
            const txt      = typeof stmt === "string" ? stmt : (stmt?.text ?? "");
            return (
              <div
                key={idx}
                className={`grid grid-cols-[1fr_96px_96px] border-b border-slate-100 last:border-0 transition-colors ${
                  isBenar ? "bg-emerald-50/60" : isSalah ? "bg-red-50/60" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {idx + 1}
                  </span>
                  <div
                    className="html-content flex-1 text-sm font-medium leading-relaxed text-slate-900"
                    dangerouslySetInnerHTML={{ __html: txt }}
                  />
                </div>
                {/* Benar */}
                <div className="flex items-center justify-center px-2 py-4">
                  <button
                    type="button"
                    onClick={() => setBSAnswer(idx, true)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all ${
                      isBenar
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-400 to-green-500 shadow-md shadow-emerald-200"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                    title="Benar"
                  >
                    {isBenar && <i className="fas fa-check text-xs text-white" />}
                  </button>
                </div>
                {/* Salah */}
                <div className="flex items-center justify-center px-2 py-4">
                  <button
                    type="button"
                    onClick={() => setBSAnswer(idx, false)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all ${
                      isSalah
                        ? "border-red-500 bg-gradient-to-br from-red-400 to-rose-500 shadow-md shadow-red-200"
                        : "border-slate-200 bg-white hover:border-red-300"
                    }`}
                    title="Salah"
                  >
                    {isSalah && <i className="fas fa-xmark text-xs text-white" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default AnswerArea;
