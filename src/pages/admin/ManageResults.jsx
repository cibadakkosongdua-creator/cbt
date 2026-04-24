import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import { toastSuccess, toastError } from "../../lib/notify";
import { DEFAULT_EXAM_CONFIG, getPassScore, getSubtesLabel, isTKA, MAPEL_LIST } from "../../lib/examConfig";
import { logActivity } from "../../lib/activityLog";
import { useAuthStore } from "../../store/authStore";
import StudentProfileModal from "../../ui/StudentProfileModal";

const toDateSafe = (value) => {
  if (!value) return new Date(0);
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const ManageResults = () => {
  const { user } = useAuthStore();
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kelasFilter, setKelasFilter] = useState("all");
  const [subtesFilter, setSubtesFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [filterJenis, setFilterJenis] = useState("TKA");
  const [activeView, setActiveView] = useState("hasil"); // "hasil" | "rekap"
  const [selectedStudent, setSelectedStudent] = useState(null); // for profile modal
  const [initialLoading, setInitialLoading] = useState(true);
  const [examConfig, setExamConfig] = useState(DEFAULT_EXAM_CONFIG);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const itemsPerPage = 10;
  const passScore = getPassScore(examConfig);
  const [loading, setLoading] = useState(false);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      setResults(
        (data || []).map((r) => ({
          ...r,
          submittedAt: r.submitted_at ? new Date(r.submitted_at) : new Date(),
        }))
      );
    } catch (err) {
      console.error("[CBT] fetchResults error:", err);
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const channel = supabase
      .channel("results-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, () => fetchResults())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) setExamConfig((prev) => ({ ...prev, ...data }));
    });
    const settingsChannel = supabase
      .channel("settings-results-ch")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, (payload) => {
        setExamConfig((prev) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
    return () => supabase.removeChannel(settingsChannel);
  }, []);

  const filteredResults = useMemo(() => {
    let filtered = results;
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.student_id?.includes(search),
      );
    }
    if (kelasFilter !== "all")
      filtered = filtered.filter((r) => r.kelas === kelasFilter);
    if (subtesFilter !== "all") {
      filtered = filtered.filter(
        (r) => (r.subtes || "literasi") === subtesFilter,
      );
    } else {
      if (filterJenis === "TKA") {
        filtered = filtered.filter((r) => (r.subtes || "literasi") === "literasi" || r.subtes === "numerasi");
      } else {
        filtered = filtered.filter((r) => r.subtes && r.subtes !== "literasi" && r.subtes !== "numerasi");
      }
    }
    if (modeFilter !== "all")
      filtered = filtered.filter((r) => (r.mode || "tryout") === modeFilter);
    if (statusFilter === "pass")
      filtered = filtered.filter((r) => (r.score ?? 0) >= passScore);
    if (statusFilter === "fail")
      filtered = filtered.filter((r) => (r.score ?? 0) < passScore);
    return filtered;
  }, [
    results,
    search,
    statusFilter,
    passScore,
    kelasFilter,
    subtesFilter,
    modeFilter,
    filterJenis,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResults.length / itemsPerPage),
  );
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const availableKelas = [
    ...new Set(results.map((r) => r.kelas).filter(Boolean)),
  ].sort();

  const handleDelete = (id, studentName) => {
    Swal.fire({
      title: "Hapus Hasil Ujian?",
      html: `<small>${studentName}</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Hapus!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { error } = await supabase.from("results").delete().eq("id", id);
          if (error) throw error;
          await logActivity("results_deleted", `Hasil ujian dihapus: ${studentName}`, user);
          toastSuccess("Data hasil ujian telah dihapus");
        } catch (error) {
          toastError(error.message || "Gagal menghapus data");
        }
      }
    });
  };

  const exportExcel = () => {
    if (filteredResults.length === 0) {
      Swal.fire("Gagal", "Tidak ada data untuk diekspor", "warning");
      return;
    }

    try {
      const dataToExport = filteredResults.map((r, i) => ({
        No: i + 1,
        NISN: r.student_id,
        Nama: r.student_name,
        Kelas: r.kelas,
        Ujian: r.exam_name || "Ujian",
        Skor: r.score ?? 0,
        Benar: r.correct ?? 0,
        Total: r.total ?? 0,
        Status: (r.score ?? 0) >= passScore ? "LULUS" : "GAGAL",
        Waktu: r.submittedAt.toLocaleString("id-ID"),
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
      XLSX.writeFile(
        wb,
        `Rekap_Hasil_Ujian_${new Date().toLocaleDateString("id-ID")}.xlsx`,
      );
      toastSuccess("Data berhasil diekspor");
    } catch (error) {
      toastError(error.message || "Export gagal");
    }
  };

  const getGradeColor = (score) => {
    if (score >= 90)
      return "bg-emerald-100 text-emerald-700 border border-emerald-300";
    if (score >= 80)
      return "bg-green-100 text-green-700 border border-green-300";
    if (score >= passScore)
      return "bg-blue-100 text-blue-700 border border-blue-300";
    return "bg-red-100 text-red-700 border border-red-300";
  };

  const getGradeText = (score) => {
    if (score >= 90) return "A (Sempurna)";
    if (score >= 80) return "B (Baik)";
    if (score >= 70) return "C (Lulus)";
    return "D (Gagal)";
  };

  /** Print single student result */
  const handlePrintStudent = (r) => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const status = (r.score ?? 0) >= passScore ? "LULUS" : "BELUM LULUS";
    const statusColor = (r.score ?? 0) >= passScore ? "#059669" : "#dc2626";
    printWin.document.write(`<!DOCTYPE html><html><head><title>Hasil Ujian - ${r.student_name}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Times New Roman',Times,serif;padding:32px;color:#000;max-width:800px;margin:0 auto}
      .kop-container{text-align:center;margin-bottom:24px}
      .kop-container img{width:100%;max-width:100%;max-height:160px;object-fit:contain}
      .title-doc{text-align:center;margin-bottom:24px;font-family:sans-serif}
      .title-doc h1{font-size:18px;text-transform:uppercase;text-decoration:underline;text-underline-offset:4px;margin-bottom:4px;color:#1e293b}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
      .info-item{padding:12px;border:1px solid #e2e8f0;border-radius:8px}
      .info-label{font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#94a3b8;margin-bottom:4px}
      .info-value{font-size:14px;font-weight:700;color:#1e293b}
      .score-box{text-align:center;padding:24px;border-radius:12px;background:#f8fafc;border:2px solid #e2e8f0;margin-bottom:24px}
      .score-box .score{font-size:48px;font-weight:900;color:${statusColor}}
      .score-box .status{font-size:16px;font-weight:700;color:${statusColor};margin-top:4px}
      .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
      .stat{text-align:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px}
      .stat .num{font-size:20px;font-weight:800}
      .stat .label{font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:600;margin-top:2px}
      .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0}
      @media print{body{padding:16px}}
    </style></head><body>
    <div class="kop-container">
      <img src="${window.location.origin}/kop.png" alt="Kop Surat" />
    </div>
    <div class="title-doc">
      <h1>Laporan Hasil Ujian CBT</h1>
    </div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Nama Siswa</div><div class="info-value">${r.student_name || "-"}</div></div>
      <div class="info-item"><div class="info-label">NISN</div><div class="info-value">${r.student_id || "-"}</div></div>
      <div class="info-item"><div class="info-label">Kelas</div><div class="info-value">${r.kelas || "-"}</div></div>
      <div class="info-item"><div class="info-label">Mata Pelajaran / Subtes</div><div class="info-value">${r.subtes || "-"}</div></div>
      <div class="info-item"><div class="info-label">Nama Ujian</div><div class="info-value">${r.exam_name || "Ujian"}</div></div>
      <div class="info-item"><div class="info-label">Tanggal</div><div class="info-value">${r.submittedAt instanceof Date ? r.submittedAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-"}</div></div>
    </div>
    <div class="score-box">
      <div class="score">${r.score ?? 0}</div>
      <div class="status">${status}</div>
      <div style="font-size:12px;color:#64748b;margin-top:8px">KKM: ${r.pass_score || passScore} · Grade: ${getGradeText(r.score ?? 0)}</div>
    </div>
    <div class="stats">
      <div class="stat"><div class="num" style="color:#059669">${r.correct ?? 0}</div><div class="label">Benar</div></div>
      <div class="stat"><div class="num" style="color:#dc2626">${(r.total ?? 0) - (r.correct ?? 0)}</div><div class="label">Salah</div></div>
      <div class="stat"><div class="num" style="color:#4f46e5">${r.duration ?? "-"}</div><div class="label">Durasi</div></div>
    </div>
    <div class="footer">Dicetak pada ${new Date().toLocaleString("id-ID")} · Smart CBT SDN 02 Cibadak</div>
    <div style="text-align:center;font-size:8px;color:#94a3b8;margin-top:4px">Ref: ${r.id}</div>
    <script>setTimeout(()=>{window.print();},400)<\/script>
    </body></html>`);
    printWin.document.close();
  };

  /** Print all filtered students recap */
  const handlePrintAll = () => {
    if (filteredResults.length === 0) {
      Swal.fire("Info", "Tidak ada data untuk dicetak", "info");
      return;
    }
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const rows = filteredResults.map((r, i) => {
      const pScore = r.pass_score || passScore;
      const isLulus = (r.score ?? 0) >= pScore;
      return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0">${r.student_id || "-"}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600">${r.student_name || "-"}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">${r.kelas || "-"}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0">${r.subtes || "-"}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:${isLulus ? "#059669" : "#dc2626"}">${r.score ?? 0}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">${r.correct ?? 0}/${r.total ?? 0}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600">${getGradeText(r.score ?? 0).split(" ")[0]}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;color:${isLulus ? "#059669" : "#dc2626"};font-weight:600">${isLulus ? "LULUS" : "GAGAL"}</td>
      </tr>
    `}).join("");
    const avg = filteredResults.length ? Math.round(filteredResults.reduce((s, r) => s + (r.score ?? 0), 0) / filteredResults.length) : 0;
    const lulusCount = filteredResults.filter(r => (r.score ?? 0) >= (r.pass_score || passScore)).length;

    printWin.document.write(`<!DOCTYPE html><html><head><title>Rekap Hasil Ujian</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',system-ui,sans-serif;padding:24px;color:#1e293b;font-size:11px}
      h1{font-size:16px;color:#4f46e5;text-align:center;margin-bottom:4px}
      .sub{text-align:center;font-size:11px;color:#64748b;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{padding:8px;border:1px solid #cbd5e1;background:#f1f5f9;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;color:#475569}
      .summary{display:flex;gap:24px;justify-content:center;padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:16px}
      .summary div{text-align:center}
      .summary .num{font-size:18px;font-weight:800}
      .summary .label{font-size:9px;color:#94a3b8;text-transform:uppercase}
      .footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0}
      @media print{body{padding:12px}}
    </style></head><body>
    <h1>REKAP HASIL UJIAN</h1>
    <div class="sub">SDN 02 Cibadak — Smart CBT · Dicetak ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</div>
    <div class="summary">
      <div><div class="num">${filteredResults.length}</div><div class="label">Peserta</div></div>
      <div><div class="num" style="color:#4f46e5">${avg}%</div><div class="label">Rata-rata</div></div>
      <div><div class="num" style="color:#059669">${lulusCount}</div><div class="label">Lulus</div></div>
      <div><div class="num" style="color:#dc2626">${filteredResults.length - lulusCount}</div><div class="label">Gagal</div></div>
    </div>
    <table>
      <thead><tr>
        <th>No</th><th>NISN</th><th>Nama</th><th>Kelas</th><th>Mapel</th><th>Skor</th><th>Benar</th><th>Grade</th><th>Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Dicetak pada ${new Date().toLocaleString("id-ID")} · Smart CBT SDN 02 Cibadak</div>
    <script>setTimeout(()=>{window.print();},400)<\/script>
    </body></html>`);
    printWin.document.close();
  };

  return (
    <>
      <div className="space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-50 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Hasil
                </div>
                <div className="mt-1 text-4xl font-black text-slate-800">
                  {results.length}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-indigo-50 text-indigo-600 shadow-inner">
                <i className="fas fa-chart-pie text-xl" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-50 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lulus (&ge;{passScore})
                </div>
                <div className="mt-1 text-4xl font-black text-emerald-600">
                  {results.filter((r) => (r.score ?? 0) >= passScore).length}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-600 shadow-inner">
                <i className="fas fa-check-circle text-xl" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-50 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Gagal (&lt;{passScore})
                </div>
                <div className="mt-1 text-4xl font-black text-rose-600">
                  {results.filter((r) => (r.score ?? 0) < passScore).length}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-rose-50 text-rose-600 shadow-inner">
                <i className="fas fa-times-circle text-xl" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-50 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rata-rata Skor
                </div>
                <div className="mt-1 text-4xl font-black text-amber-500">
                  {results.length > 0
                    ? (
                      results.reduce((a, r) => a + (r.score ?? 0), 0) / results.length
                    ).toFixed(0)
                    : 0}
                  %
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-50 text-amber-500 shadow-inner">
                <i className="fas fa-chart-line text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* VIEW TOGGLE */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          {[
            { id: "hasil", label: "Daftar Hasil", icon: "fa-list" },
            { id: "rekap", label: "Rekap per Kelas", icon: "fa-table" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView === v.id
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <i className={`fas ${v.icon} text-xs`} />
              {v.label}
            </button>
          ))}
        </div>

        {/* FILTER & SEARCH */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Cari Hasil
              </label>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Nama atau NISN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Filter Kelas
              </label>
              <select
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value)}
                className="input text-sm"
              >
                <option value="all">Semua Kelas</option>
                {availableKelas.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={exportExcel}
              className="btn btn-primary w-full text-sm"
            >
              <i className="fas fa-download" /> Export Excel
            </button>

            <button
              onClick={handlePrintAll}
              className="btn btn-outline w-full text-sm"
            >
              <i className="fas fa-print" /> Cetak Rekap Semua
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {filteredResults.length} / {results.length} Hasil
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* ── Status ── */}
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Status:</span>
            {[
              { id: "all", label: "Semua", color: "bg-slate-100 text-slate-600 hover:bg-slate-200", active: "bg-indigo-600 text-white shadow-sm" },
              { id: "pass", label: "✓ Lulus", color: "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200", active: "bg-green-600 text-white shadow-sm" },
              { id: "fail", label: "✗ Gagal", color: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200", active: "bg-red-600 text-white shadow-sm" },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === chip.id ? chip.active : chip.color
                  }`}
              >
                {chip.label}
              </button>
            ))}

            {/* ── Jenis (2-level toggle) ── */}
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Jenis:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
              {[
                { id: "TKA", label: "TKA", icon: "fa-brain" },
                { id: "MAPEL", label: "Mapel", icon: "fa-graduation-cap" },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setFilterJenis(t.id); setSubtesFilter("all"); }}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${filterJenis === t.id
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <i className={`fas ${t.icon} text-[10px]`} />
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSubtesFilter("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${subtesFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >Semua</button>

            {filterJenis === "TKA" ? (
              ["literasi", "numerasi"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubtesFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${subtesFilter === s
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                    }`}
                >{getSubtesLabel(s)}</button>
              ))
            ) : (
              <select
                value={subtesFilter === "all" ? "all" : subtesFilter}
                onChange={(e) => setSubtesFilter(e.target.value)}
                className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 outline-none transition hover:bg-purple-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">Pilih Mapel (Semua)</option>
                {MAPEL_LIST.map(m => (
                  <option key={m} value={m}>{getSubtesLabel(m)}</option>
                ))}
              </select>
            )}

            {/* ── Mode ── */}
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Mode:</span>
            {[
              { id: "all", label: "Semua", color: "bg-slate-100 text-slate-600 hover:bg-slate-200", active: "bg-indigo-600 text-white shadow-sm" },
              { id: "tryout", label: "⏱ Tryout", color: "bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200", active: "bg-violet-600 text-white shadow-sm" },
              { id: "latihan", label: "🏋 Latihan", color: "bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200", active: "bg-violet-600 text-white shadow-sm" },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setModeFilter(chip.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${modeFilter === chip.id ? chip.active : chip.color
                  }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE */}
        {activeView === "hasil" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {initialLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-11 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-xs">
                  <colgroup>
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        No
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        NISN
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Nama
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Kelas
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Ujian
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Skor
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Benar
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Grade
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Tgl
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.length === 0 ? (
                      <EmptyState
                        icon="fa-file-invoice"
                        title="Belum Ada Hasil Ujian"
                        description={search ? "Tidak ada hasil yang cocok dengan pencarian Anda." : "Siswa belum ada yang menyelesaikan ujian."}
                        colSpan={10}
                      />
                    ) : (
                      (() => {
                        const startIdx = (safeCurrentPage - 1) * itemsPerPage;
                        const paginatedData = filteredResults.slice(
                          startIdx,
                          startIdx + itemsPerPage,
                        );

                        return paginatedData.map((r, idx) => {
                          const isExpanded = expandedId === r.id;
                          return (
                            <React.Fragment key={r.id}>
                              <tr
                                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                className={`group border-b border-slate-100 transition-colors hover:bg-slate-50 cursor-pointer ${isExpanded ? "bg-slate-50" : "bg-white"}`}
                              >
                                <td className="px-3 py-2.5 text-slate-500">
                                  {startIdx + idx + 1}
                                </td>
                                <td
                                  className="truncate px-3 py-2.5 font-semibold text-indigo-600"
                                  title={r.student_id}
                                >
                                  {r.student_id}
                                </td>
                                <td
                                  className="truncate px-3 py-2.5 font-semibold text-slate-900"
                                  title={r.student_name}
                                >
                                  <button
                                    type="button"
                                    className="hover:text-indigo-600 hover:underline underline-offset-2 transition-colors text-left font-semibold"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudent(r);
                                    }}
                                  >
                                    {r.student_name}
                                  </button>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                    {r.kelas || "–"}
                                  </span>
                                </td>
                                <td
                                  className="truncate px-3 py-2.5 text-slate-600"
                                  title={r.exam_name || "Ujian"}
                                >
                                  {r.exam_name || "Ujian"}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`text-sm font-bold ${(r.score ?? 0) >= passScore
                                        ? "text-green-600"
                                        : "text-red-600"
                                      }`}
                                  >
                                    {r.score ?? 0}%
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
                                  {r.correct ?? 0}/{r.total ?? 0}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getGradeColor(r.score ?? 0)}`}
                                  >
                                    {getGradeText(r.score ?? 0).split(" ")[0]}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-500">
                                  {r.submittedAt.toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                  })}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : r.id); }}
                                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all ${isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                    title="Detail"
                                  >
                                    <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan="10" className="p-0 border-b border-slate-100">
                                    <div className="bg-slate-50 p-6 shadow-inner animate-fade-in-up">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Pengerjaan */}
                                        <div className="flex flex-col gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pengerjaan</span>
                                          <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-xs font-semibold text-slate-500">Durasi</span>
                                            <span className="text-sm font-bold text-slate-800">{r.duration !== undefined ? `${r.duration} Menit` : "-"}</span>
                                          </div>
                                          <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-xs font-semibold text-slate-500">Mode</span>
                                            <span className="text-sm font-bold text-slate-800 capitalize">{r.mode || "Tryout"}</span>
                                          </div>
                                        </div>

                                        {/* Statistik Jawaban */}
                                        <div className="flex flex-col gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Statistik Jawaban</span>
                                          <div className="flex justify-between items-center bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100/80 shadow-sm">
                                            <span className="text-xs font-semibold text-emerald-600">Benar</span>
                                            <span className="text-sm font-bold text-emerald-700">{r.correct || 0}</span>
                                          </div>
                                          <div className="flex justify-between items-center bg-red-50 px-4 py-2.5 rounded-xl border border-red-100/80 shadow-sm">
                                            <span className="text-xs font-semibold text-red-600">Salah</span>
                                            <span className="text-sm font-bold text-red-700">{(r.total || 0) - (r.correct || 0)}</span>
                                          </div>
                                        </div>

                                        {/* Aksi & Lainnya */}
                                        <div className="flex flex-col gap-2">
                                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Aksi</span>
                                          <div className="flex flex-col gap-2 h-full">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handlePrintStudent(r); }}
                                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 font-bold px-4 py-3 border border-indigo-100 transition-colors shadow-sm"
                                            >
                                              <i className="fas fa-print text-sm" /> Cetak Hasil Siswa
                                            </button>
                                            <button
                                              onClick={() => handleDelete(r.id, r.student_name)}
                                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white hover:bg-red-50 text-red-600 font-bold px-4 py-3 border border-red-100 transition-colors shadow-sm"
                                            >
                                              <i className="fas fa-trash-alt text-sm" /> Hapus Hasil Ujian
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            {!initialLoading && filteredResults.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                <div className="text-sm text-slate-500">
                  Menampilkan{" "}
                  {Math.min(
                    (safeCurrentPage - 1) * itemsPerPage + 1,
                    filteredResults.length,
                  )}{" "}
                  -{" "}
                  {Math.min(
                    safeCurrentPage * itemsPerPage,
                    filteredResults.length,
                  )}{" "}
                  dari {filteredResults.length} hasil
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={safeCurrentPage === 1}
                    className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <i className="fas fa-chevron-left mr-1" /> Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      {
                        length: Math.ceil(filteredResults.length / itemsPerPage),
                      },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${safeCurrentPage === page
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(
                          prev + 1,
                          Math.ceil(filteredResults.length / itemsPerPage),
                        ),
                      )
                    }
                    disabled={safeCurrentPage === totalPages}
                    className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Next <i className="fas fa-chevron-right ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REKAP PER KELAS */}
        {activeView === "rekap" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-900">
                Rekap Nilai per Kelas
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Berdasarkan filter aktif
              </p>
            </div>
            {(() => {
              const kelasList = [
                ...new Set(filteredResults.map((r) => r.kelas).filter(Boolean)),
              ].sort();
              // Detect all subtes categories dynamically
              const allSubtes = [...new Set(filteredResults.map(r => r.subtes || "literasi"))].sort();

              if (kelasList.length === 0)
                return (
                  <div className="py-12 text-center text-sm text-slate-400">
                    <i className="fas fa-inbox mb-3 block text-3xl text-slate-300" />
                    Tidak ada data untuk ditampilkan
                  </div>
                );
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {[
                          "Kelas",
                          "Peserta",
                          "Rata-rata",
                          "Tertinggi",
                          "Terendah",
                          ...allSubtes.map(s => getSubtesLabel(s)),
                          "Lulus",
                          "Belum",
                          "% Lulus",
                        ].map((h) => (
                          <th
                            key={h}
                            className="bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kelasList.map((kelas) => {
                        const rows = filteredResults.filter(
                          (r) => r.kelas === kelas,
                        );
                        const avg = rows.length
                          ? Math.round(
                            rows.reduce((s, r) => s + (r.score || 0), 0) /
                            rows.length,
                          )
                          : 0;
                        const max = rows.length
                          ? Math.max(...rows.map((r) => r.score || 0))
                          : 0;
                        const min = rows.length
                          ? Math.min(...rows.map((r) => r.score || 0))
                          : 0;
                        const lulus = rows.filter(
                          (r) => (r.score || 0) >= passScore,
                        ).length;
                        const pct = rows.length
                          ? Math.round((lulus / rows.length) * 100)
                          : 0;

                        // Per-subtes averages
                        const subtesAvgs = allSubtes.map(s => {
                          const subset = rows.filter(r => (r.subtes || "literasi") === s);
                          return subset.length
                            ? Math.round(subset.reduce((a, r) => a + (r.score || 0), 0) / subset.length)
                            : "–";
                        });

                        return (
                          <tr key={kelas} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-indigo-700">
                              Kelas {kelas}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {rows.length}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold ${avg >= passScore ? "text-green-600" : "text-red-500"}`}
                              >
                                {avg}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-600">
                              {max}
                            </td>
                            <td className="px-4 py-3 font-semibold text-red-500">
                              {min}
                            </td>
                            {subtesAvgs.map((val, i) => (
                              <td key={allSubtes[i]} className="px-4 py-3 font-semibold text-slate-700">
                                {val}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-green-600 font-semibold">
                              {lulus}
                            </td>
                            <td className="px-4 py-3 text-red-500 font-semibold">
                              {rows.length - lulus}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full ${pct >= 70 ? "bg-green-500" : "bg-red-400"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-slate-700">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          passScore={passScore}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
};

export default ManageResults;
