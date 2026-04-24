import React, { useState, useEffect, useRef, useMemo } from "react";
import { getSubtesLabel } from "../lib/examConfig";

/**
 * CommandPalette — Ctrl+K / Cmd+K quick navigation + data search modal.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onNavigate: (tabId) => void
 * - menuItems: Array of { id, label, icon }
 * - students: Array of { id, name, kelas }
 * - questions: Array of { id, question, type, subtes }
 * - results: Array of { id, studentName, score, subtes }
 * - onPreview: (subtes) => void
 * - onLogout: () => void
 */
const CommandPalette = ({
  open,
  onClose,
  onNavigate,
  menuItems = [],
  students = [],
  questions = [],
  results = [],
  onPreview,
  onLogout,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build searchable items
  const allItems = useMemo(() => {
    const items = [];

    // Menu navigation
    menuItems.forEach((m) => {
      items.push({
        id: `nav:${m.id}`,
        type: "navigation",
        icon: m.icon,
        title: m.label,
        subtitle: "Navigasi menu",
        action: () => {
          onNavigate?.(m.id);
          onClose?.();
        },
      });
    });

    // Quick actions
    items.push({
      id: "action:add-question",
      type: "action",
      icon: "fa-plus-circle",
      title: "Tambah Soal Baru",
      subtitle: "Quick action",
      action: () => {
        onNavigate?.("questions");
        onClose?.();
      },
    });
    items.push({
      id: "action:add-student",
      type: "action",
      icon: "fa-user-plus",
      title: "Tambah Siswa Baru",
      subtitle: "Quick action",
      action: () => {
        onNavigate?.("students");
        onClose?.();
      },
    });
    items.push({
      id: "action:export",
      type: "action",
      icon: "fa-download",
      title: "Export Hasil Excel",
      subtitle: "Quick action",
      action: () => {
        onNavigate?.("results");
        onClose?.();
      },
    });

    items.push({
      id: "action:logout",
      type: "action",
      icon: "fa-sign-out-alt",
      title: "Logout dari Dashboard",
      subtitle: "Keluar sesi admin",
      action: () => {
        onLogout?.();
        onClose?.();
      },
    });

    if (onPreview) {
      items.push({
        id: "action:preview-lit",
        type: "action",
        icon: "fa-eye",
        title: "🔵 Preview Literasi",
        subtitle: "Quick action",
        action: () => {
          onPreview?.("literasi");
          onClose?.();
        },
      });
      items.push({
        id: "action:preview-num",
        type: "action",
        icon: "fa-eye",
        title: "🟠 Preview Numerasi",
        subtitle: "Quick action",
        action: () => {
          onPreview?.("numerasi");
          onClose?.();
        },
      });
    }

    // Students (data search)
    students.slice(0, 100).forEach((s) => {
      items.push({
        id: `student:${s.id}`,
        type: "student",
        icon: "fa-user-graduate",
        title: s.name,
        subtitle: `NISN: ${s.id} · Kelas ${s.kelas || "–"}`,
        action: () => {
          onNavigate?.("students");
          onClose?.();
        },
      });
    });

    // Questions (data search)
    questions.slice(0, 100).forEach((q) => {
      items.push({
        id: `question:${q.id}`,
        type: "question",
        icon: "fa-question-circle",
        title: (q.question || "").substring(0, 80),
        subtitle: `${q.type || "PG"} · ${getSubtesLabel(q.subtes || "literasi")}`,
        action: () => {
          onNavigate?.("questions");
          onClose?.();
        },
      });
    });

    // Results (data search)
    results.slice(0, 50).forEach((r) => {
      items.push({
        id: `result:${r.id}`,
        type: "result",
        icon: "fa-chart-bar",
        title: `${r.studentName} — Skor ${r.score}`,
        subtitle: `${getSubtesLabel(r.subtes || "literasi")}`,
        action: () => {
          onNavigate?.("results");
          onClose?.();
        },
      });
    });

    return items;
  }, [menuItems, students, questions, results, onNavigate, onPreview, onClose]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show nav + actions only when no query
      return allItems.filter(
        (i) => i.type === "navigation" || i.type === "action",
      );
    }
    const q = query.toLowerCase();
    return allItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.subtitle.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [allItems, query]);

  // Clamp selectedIdx
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((p) => Math.min(p + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((p) => Math.max(p - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[selectedIdx]?.action?.();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIdx, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIdx];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx]);

  if (!open) return null;

  // Group items by type
  const groups = {};
  filtered.forEach((item) => {
    const g = item.type;
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });

  const groupLabels = {
    navigation: "Menu",
    action: "Quick Actions",
    student: "Siswa",
    question: "Soal",
    result: "Hasil Ujian",
  };

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] pb-8 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <i className="fas fa-search text-slate-400 text-sm" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu, soal, siswa, atau hasil..."
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <i className="fas fa-search text-2xl text-slate-300" />
              <div className="text-sm font-semibold text-slate-500">
                Tidak ada hasil untuk &quot;{query}&quot;
              </div>
            </div>
          ) : (
            Object.entries(groups).map(([groupType, items]) => (
              <div key={groupType}>
                <div className="sticky top-0 bg-slate-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {groupLabels[groupType] || groupType}
                </div>
                {items.map((item) => {
                  const idx = flatIdx++;
                  const isSelected = idx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => item.action?.()}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <i className={`fas ${item.icon} text-xs`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`truncate font-semibold html-content ${
                            isSelected ? "text-indigo-700" : "text-slate-800"
                          }`}
                          dangerouslySetInnerHTML={{ __html: item.title }}
                        />
                        <div className="truncate text-xs text-slate-400">
                          {item.subtitle}
                        </div>
                      </div>
                      {isSelected && (
                        <kbd className="hidden sm:flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                          Enter ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-semibold text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5">↑↓</kbd>
              Navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5">Enter</kbd>
              Pilih
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5">Esc</kbd>
              Tutup
            </span>
          </div>
          <span>{filtered.length} hasil</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
