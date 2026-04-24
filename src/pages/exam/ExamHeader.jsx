import React from "react";
import Container from "../../ui/Container";

const ExamHeader = ({
  currentIndex,
  totalQuestions,
  fontSize,
  setFontSize,
  isDrawingMode,
  setIsDrawingMode,
  isFullscreen,
  toggleFullscreen,
  mode,
  timeLeft,
  initialDurationSec,
  onShowShortcuts,
}) => {
  const pct = Math.max(0, (timeLeft / initialDurationSec) * 100);
  const isUrgent   = timeLeft < 300;
  const isWarning  = timeLeft < 600;

  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-[0_1px_8px_rgb(0,0,0,0.04)]">
      <Container className="py-0">
        <div className="flex h-14 items-center justify-between gap-3">

          {/* ── Left: Brand + tools ── */}
          <div className="tour-tools flex items-center gap-2">
            {/* Question counter pill */}
            <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-200">
              <i className="fas fa-clipboard-list text-indigo-200 text-[10px]" />
              <span>{currentIndex + 1}</span>
              <span className="text-indigo-300">/</span>
              <span>{totalQuestions}</span>
            </div>

            {/* Zoom */}
            <button
              onClick={() =>
                setFontSize(
                  fontSize === "text-base" ? "text-lg" : fontSize === "text-lg" ? "text-xl" : "text-base"
                )
              }
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Ukuran teks"
            >
              <i className="fas fa-text-height text-sm" />
            </button>

            {/* Scratchpad */}
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`hidden sm:flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition ${
                isDrawingMode
                  ? "bg-orange-100 text-orange-700"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
              title="Coretan"
            >
              <i className="fas fa-pen-nib text-xs" />
              <span>Coretan</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
            >
              <i className={`fas ${isFullscreen ? "fa-compress" : "fa-expand"} text-sm`} />
            </button>

            {/* Shortcuts */}
            {onShowShortcuts && (
              <button
                onClick={onShowShortcuts}
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                title="Keyboard Shortcuts (?)"
              >
                <i className="fas fa-keyboard text-sm" />
              </button>
            )}
          </div>

          {/* ── Right: Timer ── */}
          {mode === "latihan" ? (
            <div className="tour-timer flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
              <i className="fas fa-dumbbell text-xs text-emerald-500" />
              Mode Latihan
            </div>
          ) : (
            <div
              className={`tour-timer flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-sm font-bold tabular-nums transition-colors ${
                isUrgent
                  ? "border-red-200 bg-red-50 text-red-600"
                  : isWarning
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <i
                className={`fas fa-clock text-xs ${
                  isUrgent ? "text-red-400 animate-pulse" : "text-slate-400"
                }`}
              />
              {fmtTime(timeLeft)}
            </div>
          )}
        </div>
      </Container>

      {/* Timer progress bar */}
      {mode !== "latihan" && (
        <div className="h-1 w-full bg-slate-100">
          <div
            className={`h-full transition-all duration-1000 ${
              pct > 25 ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                : pct > 10 ? "bg-amber-400"
                : "bg-red-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ExamHeader;
