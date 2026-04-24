import React, { useEffect } from "react";

const shortcuts = [
  { keys: ["←", "→"], desc: "Navigasi soal sebelum / berikutnya" },
  { keys: ["1", "–", "5"], desc: "Pilih jawaban PG (A–E)" },
  { keys: ["R"], desc: "Toggle tandai ragu-ragu" },
  { keys: ["F"], desc: "Toggle fullscreen" },
  { keys: ["Ctrl", "Enter"], desc: "Selesaikan ujian" },
  { keys: ["End"], desc: "Selesaikan ujian" },
  { keys: ["?"], desc: "Buka panduan shortcut ini" },
];

const ShortcutModal = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <i className="fas fa-keyboard text-sm text-indigo-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        {/* Shortcut list */}
        <div className="divide-y divide-slate-100 px-6 py-2">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="text-sm text-slate-600">{s.desc}</span>
              <div className="flex shrink-0 items-center gap-1">
                {s.keys.map((k, ki) => (
                  <kbd
                    key={ki}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3">
          <p className="text-center text-xs text-slate-400">
            Tekan <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold">Esc</kbd> untuk menutup
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutModal;
