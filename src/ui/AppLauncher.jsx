/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const APPS = [
  {
    name: "Web Utama",
    icon: "fa-globe",
    color: "bg-blue-500",
    url: "https://www.sdn02cibadak.sch.id/",
  },
  {
    name: "Warga 02",
    icon: "fa-users",
    color: "bg-indigo-600",
    url: "https://warga.sdn02cibadak.sch.id/",
  },
  {
    name: "Portal OPS",
    icon: "fa-gear",
    color: "bg-slate-700",
    url: "https://ops.sdn02cibadak.sch.id/",
  },
  {
    name: "SPMB 02",
    icon: "fa-user-plus",
    color: "bg-emerald-500",
    url: "https://spmb.sdn02cibadak.sch.id/",
  },
  {
    name: "02-HADIR",
    icon: "fa-fingerprint",
    color: "bg-violet-500",
    url: "https://presensi.sdn02cibadak.sch.id",
  },
  {
    name: "Siswa 02",
    icon: "fa-user-check",
    color: "bg-rose-500",
    url: "https://siswa.sdn02cibadak.sch.id/",
  },
  {
    name: "Perpustakaan",
    icon: "fa-book-open",
    color: "bg-sky-500",
    url: "https://perpus.sdn02cibadak.sch.id/",
  },
  {
    name: "Galeri",
    icon: "fa-images",
    color: "bg-amber-500",
    url: "https://media.sdn02cibadak.sch.id/",
  },
  {
    name: "SARPRAS",
    icon: "fa-warehouse",
    color: "bg-orange-500",
    url: "https://sarpras.sdn02cibadak.sch.id/",
  },
];

export default function AppLauncher() {
  const [open, setOpen] = useState(false);
  const [navigating, setNavigating] = useState(null); // { name, icon, color }
  const [apps, setApps] = useState(() => {
    try {
      const saved = localStorage.getItem("cbt_launcher_apps");
      return saved ? JSON.parse(saved) : APPS;
    } catch (e) {
      console.error("[AppLauncher] Failed to parse saved apps:", e);
      return APPS;
    }
  });
  const [draggedIdx, setDraggedIdx] = useState(null);
  const ref = useRef(null);

  // Simpan urutan ke localStorage saat berubah
  useEffect(() => {
    localStorage.setItem("cbt_launcher_apps", JSON.stringify(apps));
  }, [apps]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAppClick = (app) => {
    // Jika sedang drag, jangan navigasi
    if (draggedIdx !== null) return;
    setOpen(false);
    setNavigating(app);
    // Navigasi setelah overlay muncul
    setTimeout(() => {
      window.location.href = app.url;
    }, 600);
  };

  // ── Drag & Drop Handlers ──
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    // Untuk styling transparan saat ditarik
    setTimeout(() => {
      e.target.classList.add("opacity-20");
    }, 0);
  };

  const handleDragEnd = (e) => {
    setDraggedIdx(null);
    e.target.classList.remove("opacity-20");
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    // Reorder array secara visual saat drag over (optional, but smoother)
    const newApps = [...apps];
    const draggedItem = newApps[draggedIdx];
    newApps.splice(draggedIdx, 1);
    newApps.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    setApps(newApps);
  };

  return (
    <>
      {/* ── Tombol 9-dot ── */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            open
              ? "bg-slate-100 text-slate-900"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
          aria-label="App launcher"
          title="Aplikasi Sekolah"
        >
          {/* Grid 3x3 dots */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="2.5" cy="2.5" r="1.8" />
            <circle cx="9" cy="2.5" r="1.8" />
            <circle cx="15.5" cy="2.5" r="1.8" />
            <circle cx="2.5" cy="9" r="1.8" />
            <circle cx="9" cy="9" r="1.8" />
            <circle cx="15.5" cy="9" r="1.8" />
            <circle cx="2.5" cy="15.5" r="1.8" />
            <circle cx="9" cy="15.5" r="1.8" />
            <circle cx="15.5" cy="15.5" r="1.8" />
          </svg>
        </button>

        {/* ── Dropdown ── */}
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
              className="fixed right-2 top-16 z-50 w-[calc(100vw-1rem)] sm:absolute sm:right-0 sm:top-11 sm:w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            >
              {/* Header */}
              <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Aplikasi Sekolah
              </p>

              {/* Grid 3x3 */}
              <div className="grid grid-cols-3 gap-1">
                {apps.map((app, idx) => (
                  <button
                    key={app.name}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onClick={() => handleAppClick(app)}
                    className="group relative flex flex-col items-center gap-2 rounded-xl p-3 transition hover:bg-slate-50 active:scale-95 cursor-grab active:cursor-grabbing"
                  >
                    {/* Icon */}
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${app.color} shadow-sm transition group-hover:scale-105 group-hover:shadow-md`}
                    >
                      <i className={`fas ${app.icon} text-lg text-white`} />
                    </div>
                    {/* Label */}
                    <span className="w-full text-center text-[11px] font-medium leading-tight text-slate-600 group-hover:text-slate-900">
                      {app.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Loading Overlay (SPA-like navigation) ── */}
      {navigating && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95">
          {/* App icon */}
          <div
            className={`mb-5 flex h-20 w-20 items-center justify-center rounded-3xl ${navigating.color} shadow-lg`}
          >
            <i className={`fas ${navigating.icon} text-3xl text-white`} />
          </div>

          {/* App name */}
          <p className="mb-1 text-lg font-bold text-slate-900">
            {navigating.name}
          </p>
          <p className="mb-6 text-sm text-slate-400">Membuka aplikasi...</p>

          {/* Spinner */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${navigating.color} animate-bounce`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
