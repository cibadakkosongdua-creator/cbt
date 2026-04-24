import React from "react";

const ExamSidebar = ({
  questions,
  currentIndex,
  setCurrentIndex,
  answers,
  doubtful,
  onFinish,
}) => {
  const answered      = Object.keys(answers).length;
  const doubtfulCount = Object.keys(doubtful).filter((k) => doubtful[k]).length;
  const pct           = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  return (
    <aside className="hidden w-72 shrink-0 space-y-4 lg:block">

      {/* ── Progress Card ── */}
      <div className="card p-5">
        <div className="mb-4 text-sm font-bold text-slate-900">Progress Ujian</div>

        {/* Circular-style progress row */}
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-3 border border-indigo-100">
            <div className="text-xl font-black text-indigo-700">{answered}</div>
            <div className="text-[10px] font-semibold text-indigo-500 mt-0.5">Dijawab</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 border border-amber-100">
            <div className="text-xl font-black text-amber-600">{doubtfulCount}</div>
            <div className="text-[10px] font-semibold text-amber-500 mt-0.5">Ragu</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
            <div className="text-xl font-black text-slate-500">{questions.length - answered}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Belum</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-500">
            <span>Progress</span>
            <span className="text-indigo-600">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-400">
          {[
            { color: "bg-gradient-to-r from-indigo-500 to-violet-500", label: "Aktif" },
            { color: "bg-indigo-100 border border-indigo-200", label: "Dijawab" },
            { color: "bg-amber-300", label: "Ragu" },
            { color: "bg-slate-100 border border-slate-200", label: "Kosong" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Navigation Grid ── */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">Navigasi Soal</div>
          <span className="text-xs text-slate-400">{questions.length} soal</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {questions.map((q, idx) => {
            const isActive   = currentIndex === idx;
            const isDoubtful = doubtful[q.id];
            const isAnswered = answers[q.id] !== undefined;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`aspect-square w-full rounded-xl text-xs font-bold transition-all active:scale-90 ${
                  isActive
                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200 scale-105"
                    : isDoubtful
                      ? "border border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : isAnswered
                        ? "border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        : "border border-slate-200 bg-white text-slate-400 hover:border-indigo-200 hover:text-indigo-500"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Finish Button ── */}
      <button
        onClick={onFinish}
        className="btn btn-danger w-full py-3.5 rounded-2xl text-base"
      >
        <i className="fas fa-flag-checkered" />
        Selesai Ujian
      </button>
    </aside>
  );
};

export default ExamSidebar;
