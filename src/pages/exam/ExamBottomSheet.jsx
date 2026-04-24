import React, { useState, useRef, useCallback, useEffect } from "react";

const SNAP_COLLAPSED = 68;
const SNAP_HALF      = 45;   // vh
const SNAP_FULL      = 82;   // vh

const ExamBottomSheet = ({
  questions = [],
  currentIndex,
  setCurrentIndex,
  answers = {},
  doubtful = {},
  onFinish,
}) => {
  const [sheetHeight, setSheetHeight] = useState(SNAP_COLLAPSED);
  const [isDragging,  setIsDragging]  = useState(false);
  const startY      = useRef(0);
  const startHeight = useRef(0);
  const sheetRef    = useRef(null);

  const isExpanded = sheetHeight > SNAP_COLLAPSED + 10;
  const vhToPx     = useCallback((vh) => (vh / 100) * window.innerHeight, []);

  const snapToNearest = useCallback((currentPx) => {
    const snaps = [SNAP_COLLAPSED, vhToPx(SNAP_HALF), vhToPx(SNAP_FULL)];
    let closest = snaps[0], minDist = Infinity;
    for (const s of snaps) {
      const dist = Math.abs(currentPx - s);
      if (dist < minDist) { minDist = dist; closest = s; }
    }
    setSheetHeight(closest);
  }, [vhToPx]);

  /* Touch handlers */
  const onTouchStart = useCallback((e) => {
    setIsDragging(true);
    startY.current      = e.touches[0].clientY;
    startHeight.current = sheetHeight === SNAP_COLLAPSED ? SNAP_COLLAPSED : sheetHeight;
  }, [sheetHeight]);

  const onTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const deltaY    = startY.current - e.touches[0].clientY;
    const newHeight = Math.max(SNAP_COLLAPSED, Math.min(startHeight.current + deltaY, vhToPx(SNAP_FULL)));
    setSheetHeight(newHeight);
  }, [isDragging, vhToPx]);

  const onTouchEnd = useCallback(() => {
    setIsDragging(false);
    snapToNearest(sheetHeight);
  }, [sheetHeight, snapToNearest]);

  const onMouseDown = useCallback((e) => {
    setIsDragging(true);
    startY.current      = e.clientY;
    startHeight.current = sheetHeight === SNAP_COLLAPSED ? SNAP_COLLAPSED : sheetHeight;
  }, [sheetHeight]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      const deltaY    = startY.current - e.clientY;
      const newHeight = Math.max(SNAP_COLLAPSED, Math.min(startHeight.current + deltaY, vhToPx(SNAP_FULL)));
      setSheetHeight(newHeight);
    };
    const onUp = () => { setIsDragging(false); snapToNearest(sheetHeight); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, sheetHeight, snapToNearest, vhToPx]);

  const answered      = Object.keys(answers).length;
  const doubtfulCount = Object.keys(doubtful).filter((k) => doubtful[k]).length;
  const progress      = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  const toggleSheet = () => {
    if (sheetHeight <= SNAP_COLLAPSED + 10) setSheetHeight(vhToPx(SNAP_HALF));
    else setSheetHeight(SNAP_COLLAPSED);
  };

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity md:hidden"
          onClick={() => setSheetHeight(SNAP_COLLAPSED)}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 md:hidden"
        style={{
          height: `${sheetHeight}px`,
          transition: isDragging ? "none" : "height 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <div className="flex h-full flex-col rounded-t-3xl border-t border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-8px_32px_rgb(0,0,0,0.12)]">

          {/* Drag handle */}
          <div
            className="flex shrink-0 cursor-grab items-center justify-center pb-1 pt-3 active:cursor-grabbing"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onClick={toggleSheet}
          >
            <div className="h-1 w-10 rounded-full bg-slate-300" />
          </div>

          {/* Collapsed bar */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Badge soal */}
              <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-200">
                <i className="fas fa-clipboard-list text-indigo-200 text-[10px]" />
                {(currentIndex || 0) + 1}/{questions.length}
              </div>
              {/* Mini progress bar */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{answered}/{questions.length}</span>
              </div>
            </div>
            {/* Finish button */}
            <button
              type="button"
              onClick={onFinish}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-3.5 text-xs font-bold text-white shadow-md shadow-red-200 transition active:scale-95"
            >
              <i className="fas fa-flag-checkered text-[10px]" />
              Selesai
            </button>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="flex-1 overflow-y-auto border-t border-slate-100 px-4 py-4">

              {/* Stats mini row */}
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-3">
                  <div className="text-lg font-black text-indigo-700">{answered}</div>
                  <div className="text-[10px] font-semibold text-indigo-500">Dijawab</div>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                  <div className="text-lg font-black text-amber-600">{doubtfulCount}</div>
                  <div className="text-[10px] font-semibold text-amber-500">Ragu</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-lg font-black text-slate-500">{questions.length - answered}</div>
                  <div className="text-[10px] font-semibold text-slate-400">Belum</div>
                </div>
              </div>

              {/* Legend */}
              <div className="mb-3 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-400">
                {[
                  { cls: "bg-gradient-to-r from-indigo-500 to-violet-500", label: "Aktif" },
                  { cls: "bg-indigo-100 border border-indigo-200",          label: "Dijawab" },
                  { cls: "bg-amber-300",                                   label: "Ragu" },
                  { cls: "bg-slate-100 border border-slate-200",           label: "Kosong" },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${l.cls}`} />
                    {l.label}
                  </span>
                ))}
              </div>

              {/* Question grid — bigger cells for touch */}
              <div className="grid grid-cols-6 gap-1.5">
                {questions.map((q, idx) => {
                  const isActive   = currentIndex === idx;
                  const isDoubtful = doubtful[q.id];
                  const isAnswered = answers[q.id] !== undefined;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => { setCurrentIndex(idx); setSheetHeight(SNAP_COLLAPSED); }}
                      className={`aspect-square w-full rounded-xl text-xs font-bold transition-all active:scale-90 ${
                        isActive
                          ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"
                          : isDoubtful
                            ? "border border-amber-300 bg-amber-100 text-amber-700"
                            : isAnswered
                              ? "border border-indigo-200 bg-indigo-50 text-indigo-600"
                              : "border border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Full-mode finish button */}
              {sheetHeight > vhToPx(SNAP_HALF) - 10 && (
                <button
                  type="button"
                  onClick={onFinish}
                  className="mt-5 w-full rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 py-4 text-sm font-bold text-white shadow-lg shadow-red-200 transition active:scale-[0.98]"
                >
                  <i className="fas fa-flag-checkered mr-2" />
                  Selesai Ujian
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ExamBottomSheet;
