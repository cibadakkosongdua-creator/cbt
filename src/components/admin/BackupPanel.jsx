import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import { toastSuccess, toastError } from "../../lib/notify";

/**
 * Backup Panel — export all critical Supabase tables to a single JSON file.
 * No restore (safer for small schools; restore would need careful merge logic).
 * Included: students, questions, results, settings, announcements.
 */
const COLLECTIONS = [
  { name: "students", label: "Data Siswa" },
  { name: "questions", label: "Bank Soal" },
  { name: "results", label: "Hasil Ujian" },
  { name: "announcements", label: "Pengumuman" },
];

const sanitize = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitize(v);
    }
    return out;
  }
  return obj;
};

const BackupPanel = () => {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    const confirm = await Swal.fire({
      title: "Unduh Backup Database?",
      html: `
        <div class="text-left text-sm text-slate-600 space-y-2">
          <p>Semua data akan diunduh sebagai file <code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">.json</code> terenkripsi-ringan.</p>
          <ul class="pl-5 list-disc text-xs space-y-1">
            ${COLLECTIONS.map((c) => `<li>${c.label}</li>`).join("")}
            <li>Pengaturan Ujian</li>
          </ul>
          <p class="text-xs text-slate-400 mt-2">Simpan file di tempat aman. Anda bisa me-restore dengan bantuan admin teknis.</p>
        </div>`,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      confirmButtonText: "Unduh",
      cancelButtonText: "Batal",
    });
    if (!confirm.isConfirmed) return;

    setBusy(true);
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: "cbt-sd-backup",
        collections: {},
        settings: null,
      };

      // Tables
      for (const c of COLLECTIONS) {
        const { data } = await supabase.from(c.name).select("*");
        payload.collections[c.name] = (data || []).map((row) => ({
          id: row.id,
          data: sanitize(row),
        }));
      }
      // Settings
      const { data: settingsData } = await supabase.from("settings").select("*").eq("id", 1).single();
      if (settingsData) payload.settings = sanitize(settingsData);

      const totalDocs = Object.values(payload.collections).reduce((a, arr) => a + arr.length, 0);

      // Trigger download
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `cbt-backup-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastSuccess(`Backup berhasil · ${totalDocs.toLocaleString("id-ID")} dokumen`);
    } catch (err) {
      console.error("[CBT] Backup error:", err);
      toastError("Gagal membuat backup: " + (err.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md">
          <i className="fas fa-cloud-arrow-down text-base text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900">Backup Database</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            Unduh seluruh data sekolah (siswa, soal, hasil ujian, pengaturan) sebagai satu file JSON.
            Backup berkala sangat disarankan sebelum aksi berbahaya.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-sky-700 border border-sky-200 transition hover:bg-sky-50 hover:border-sky-300 disabled:opacity-60 sm:w-auto sm:px-5"
          >
            {busy ? (
              <>
                <i className="fas fa-spinner fa-spin" />
                <span>Mengumpulkan data...</span>
              </>
            ) : (
              <>
                <i className="fas fa-download" />
                <span>Unduh Backup Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupPanel;
