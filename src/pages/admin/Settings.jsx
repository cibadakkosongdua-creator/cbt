import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { DEFAULT_EXAM_CONFIG, MAPEL_LIST } from "../../lib/examConfig";
import { logActivity } from "../../lib/activityLog";
import { useAuthStore } from "../../store/authStore";
import PageHeader from "../../components/admin/PageHeader";
import BackupPanel from "../../components/admin/BackupPanel";

/* ── Toggle Switch Component ── */
const ToggleSwitch = ({ checked, onChange, label, description, accentColor = "indigo" }) => {
  const colorMap = {
    indigo: { on: "bg-indigo-600", dot: "bg-white" },
    emerald: { on: "bg-emerald-600", dot: "bg-white" },
    violet: { on: "bg-violet-600", dot: "bg-white" },
    amber: { on: "bg-amber-500", dot: "bg-white" },
    rose: { on: "bg-rose-600", dot: "bg-white" },
  };
  const colors = colorMap[accentColor] || colorMap.indigo;

  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50/50 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-800">{label}</div>
        {description && <div className="mt-0.5 text-xs text-slate-500 leading-relaxed">{description}</div>}
      </div>
      <div className="shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${checked ? colors.on : "bg-slate-200"}`}>
          <div className={`absolute h-4.5 w-4.5 rounded-full ${colors.dot} shadow-sm transition-transform duration-300 ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
        </div>
      </div>
    </label>
  );
};

/* ── Section Card Component ── */
const SectionCard = ({ icon, iconBg, iconColor, title, description, children, className = "" }) => (
  <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
    <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 md:px-8 md:py-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} shadow-inner shrink-0`}>
        <i className={`fas ${icon} text-base ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="p-6 md:p-8 space-y-5">{children}</div>
  </div>
);

/* ── Field Wrapper ── */
const Field = ({ label, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

const Settings = ({ onPreview }) => {
  const { user } = useAuthStore();
  const [config, setConfig] = useState({ ...DEFAULT_EXAM_CONFIG });
  const [isSaving, setIsSaving] = useState(false);
  const [previewTarget, setPreviewTarget] = useState("literasi");
  const [deleting, setDeleting] = useState({
    questions: false,
    results: false,
    students: false,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
        if (data) {
          // Konversi snake_case ke camelCase untuk UI
          const uiConfig = {
            title: data.title,
            duration: data.duration,
            token: data.token,
            isActive: data.is_active,
            examType: data.exam_type,
            activeMapel: data.active_mapel,
            minScore: data.min_score,
            passingGrade: data.passing_grade,
            showResults: data.show_results,
            randomizeQuestions: data.randomize_questions,
            partialScoringPGK: data.partial_scoring_pgk,
            antiCheatEnabled: data.anti_cheat_enabled !== undefined ? data.anti_cheat_enabled : true,
            startAt: data.start_at || "",
            endAt: data.end_at || "",
          };
          setConfig((prev) => ({ ...prev, ...uiConfig }));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchConfig();
  }, []);

  const handleBulkDelete = async (collectionName, label, key) => {
    const step1 = await Swal.fire({
      title: `Hapus Semua ${label}?`,
      html: `
        <div class="text-left space-y-2">
          <p class="text-sm text-slate-600">Seluruh <strong>${label.toLowerCase()}</strong> akan dihapus <span class="text-red-600 font-semibold">permanen</span> dari database.</p>
          <p class="text-sm text-slate-500">Tindakan ini <strong>tidak dapat dibatalkan</strong>.</p>
        </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Lanjutkan",
      cancelButtonText: "Batal",
    });
    if (!step1.isConfirmed) return;

    const step2 = await Swal.fire({
      title: "Konfirmasi Ulang",
      html: `<p class="text-sm text-slate-600 mb-1">Ketik <strong class="text-red-600 tracking-widest">HAPUS</strong> untuk melanjutkan:</p>`,
      input: "text",
      inputPlaceholder: "HAPUS",
      inputAttributes: {
        autocomplete: "off",
        style: "text-transform:uppercase;letter-spacing:0.1em;font-weight:700;",
      },
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Hapus Permanen",
      cancelButtonText: "Batal",
      preConfirm: (val) => {
        if (String(val).trim().toUpperCase() !== "HAPUS") {
          Swal.showValidationMessage("Ketik tepat: <strong>HAPUS</strong>");
          return false;
        }
        return true;
      },
    });
    if (!step2.isConfirmed) return;

    setDeleting((d) => ({ ...d, [key]: true }));
    Swal.fire({
      title: "Menghapus...",
      text: `Sedang menghapus semua ${label.toLowerCase()}`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const snap = await supabase.from(collectionName).select("id");
      if (snap.error) throw snap.error;
      const allIds = snap.data.map((d) => d.id);
      const CHUNK = 500;
      for (let i = 0; i < allIds.length; i += CHUNK) {
        const chunk = allIds.slice(i, i + CHUNK);
        const { error: delErr } = await supabase.from(collectionName).delete().in("id", chunk);
        if (delErr) throw delErr;
      }
      await Swal.fire({
        icon: "success",
        title: "Berhasil Dihapus",
        text: `${allIds.length} data ${label.toLowerCase()} telah dihapus permanen.`,
        confirmButtonColor: "#4f46e5",
      });
      await logActivity(`${key}_bulk_deleted`, `${allIds.length} ${label.toLowerCase()} dihapus permanen`, user);
    } catch (err) {
      Swal.fire("Gagal", err.message || "Terjadi kesalahan.", "error");
    } finally {
      setDeleting((d) => ({ ...d, [key]: false }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const dbConfig = {
        id: 1,
        title: config.title,
        duration: config.duration,
        token: config.token,
        is_active: config.isActive,
        exam_type: config.examType || "MAPEL",
        active_mapel: config.activeMapel || "IPAS",
        min_score: config.minScore,
        passing_grade: config.passingGrade || "C",
        show_results: config.showResults,
        randomize_questions: config.randomizeQuestions,
        partial_scoring_pgk: config.partialScoringPGK || false,
        anti_cheat_enabled: config.antiCheatEnabled !== undefined ? config.antiCheatEnabled : true,
        start_at: config.startAt || null,
        end_at: config.endAt || null,
      };
      console.log("[Settings] Saving:", dbConfig);
      const { error, data } = await supabase.from("settings").upsert(dbConfig, { onConflict: "id" });
      console.log("[Settings] Result:", { error, data });
      if (error) throw error;
      await logActivity("settings_saved", `Pengaturan diperbarui: ${config.title}, durasi ${config.duration} menit, KKM ${config.minScore}`, user);
      Swal.fire("Berhasil!", "Pengaturan ujian berhasil diperbarui", "success");
    } catch (error) {
      Swal.fire("Gagal", error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="fa-sliders"
        iconTone="indigo"
        title="Pengaturan Ujian"
        subtitle="Atur identitas, jadwal, dan perilaku ujian untuk semua siswa"
        badge={{
          label: config.isActive ? "Ujian Aktif" : "Ujian Nonaktif",
          tone: config.isActive ? "emerald" : "slate",
          icon: config.isActive ? "fa-circle" : "fa-circle-pause",
        }}
      />

      {/* ═══ SECTION 1: IDENTITAS UJIAN ═══ */}
      <SectionCard
        icon="fa-pen-fancy"
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        title="Identitas Ujian"
        description="Judul dan token akses ujian"
      >
        <Field label="Judul Ujian" hint="Judul yang ditampilkan kepada siswa saat mengerjakan ujian">
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="Contoh: Mid Test Semester 1"
            className="input placeholder-slate-400"
          />
        </Field>

        <Field label="Jenis Ujian" hint="Tentukan apakah ini ujian Mapel (Ulangan) atau latihan TKA (Literasi/Numerasi)">
          <select
            value={config.examType || "MAPEL"}
            onChange={(e) => setConfig({ ...config, examType: e.target.value })}
            className="input font-semibold"
          >
            <option value="MAPEL">Ujian / Ulangan Harian (Mata Pelajaran)</option>
            <option value="TKA">Latihan Nasional / AKM (Literasi & Numerasi)</option>
          </select>
        </Field>

        {(!config.examType || config.examType === "MAPEL") && (
          <Field label="Mata Pelajaran (Mapel)" hint="Pilih mata pelajaran yang akan diujikan">
            <select
              value={config.activeMapel || "IPAS"}
              onChange={(e) => setConfig({ ...config, activeMapel: e.target.value })}
              className="input font-semibold"
            >
              <option value="IPAS">Ilmu Pengetahuan Alam dan Sosial (IPAS)</option>
              <option value="Matematika">Matematika</option>
              <option value="Pendidikan Agama">Pendidikan Agama dan Budi Pekerti</option>
              <option value="Pendidikan Pancasila">Pendidikan Pancasila</option>
              <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              <option value="PJOK">PJOK</option>
              <option value="Seni Budaya">Seni Budaya</option>
              <option value="Bahasa Inggris">Bahasa Inggris</option>
              <option value="Muatan Lokal">Muatan Lokal</option>
            </select>
          </Field>
        )}

        <Field label="Token Akses (Kode)" hint="Kode yang harus dimasukkan siswa untuk masuk ujian">
          <input
            type="text"
            value={config.token}
            onChange={(e) => setConfig({ ...config, token: e.target.value.toUpperCase() })}
            placeholder="Contoh: UJI2024"
            className="input bg-amber-50 border-amber-300 text-amber-900 font-bold uppercase tracking-wider placeholder-amber-500 focus:border-amber-500 focus:ring-amber-200/60"
          />
        </Field>
      </SectionCard>

      {/* ═══ SECTION 2: WAKTU & DURASI ═══ */}
      <SectionCard
        icon="fa-clock"
        iconBg="bg-sky-50"
        iconColor="text-sky-600"
        title="Waktu & Durasi"
        description="Atur durasi dan jadwal ujian"
      >
        <Field label="Durasi Ujian (Menit)" hint="Waktu maksimal untuk menyelesaikan ujian">
          <input
            type="number"
            value={config.duration}
            onChange={(e) => setConfig({ ...config, duration: Math.max(1, parseInt(e.target.value) || 1) })}
            min="1"
            max="300"
            className="input"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Mulai Ujian (Jadwal)" hint="Kosongkan jika tidak memakai jadwal">
            <input
              type="datetime-local"
              value={config.startAt || ""}
              onChange={(e) => setConfig({ ...config, startAt: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Selesai Ujian (Jadwal)" hint="Jika waktu lewat, ujian dianggap ditutup">
            <input
              type="datetime-local"
              value={config.endAt || ""}
              onChange={(e) => setConfig({ ...config, endAt: e.target.value })}
              className="input"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ═══ SECTION 3: PENILAIAN ═══ */}
      <SectionCard
        icon="fa-chart-line"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        title="Penilaian & Kelulusan"
        description="Standar skor dan grade kelulusan"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Skor Minimum Lulus (%)" hint="Nilai minimal untuk dinyatakan lulus">
            <input
              type="number"
              value={config.minScore}
              onChange={(e) => setConfig({ ...config, minScore: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
              min="0"
              max="100"
              className="input"
            />
          </Field>

          <Field label="Grade Kelulusan" hint="Standar grade untuk dinyatakan lulus">
            <select
              value={config.passingGrade}
              onChange={(e) => setConfig({ ...config, passingGrade: e.target.value })}
              className="input"
            >
              <option value="A">A (90-100)</option>
              <option value="B">B (80-89)</option>
              <option value="C">C (70-79)</option>
              <option value="D">D (&lt;70)</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      {/* ═══ SECTION 4: FITUR & OPSI (Toggle Switches) ═══ */}
      <SectionCard
        icon="fa-sliders-h"
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        title="Fitur & Opsi"
        description="Kontrol perilaku ujian"
      >
        <div className="space-y-3">
          <ToggleSwitch
            checked={config.isActive}
            onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
            label="Ujian Aktif"
            description="Aktifkan untuk memungkinkan siswa mengikuti ujian"
            accentColor="emerald"
          />
          <ToggleSwitch
            checked={config.randomizeQuestions}
            onChange={(e) => setConfig({ ...config, randomizeQuestions: e.target.checked })}
            label="Acak Urutan Soal"
            description="Soal akan ditampilkan dalam urutan acak untuk setiap siswa"
            accentColor="indigo"
          />
          <ToggleSwitch
            checked={config.showResults}
            onChange={(e) => setConfig({ ...config, showResults: e.target.checked })}
            label="Tampilkan Hasil Setelah Selesai"
            description="Siswa dapat melihat nilai dan jawaban yang benar setelah ujian selesai"
            accentColor="violet"
          />
          <ToggleSwitch
            checked={config.partialScoringPGK || false}
            onChange={(e) => setConfig({ ...config, partialScoringPGK: e.target.checked })}
            label="Partial Scoring PGK"
            description="Soal Pilihan Ganda Kompleks mendapat nilai parsial jika sebagian jawaban benar"
            accentColor="amber"
          />
          <ToggleSwitch
            checked={config.antiCheatEnabled !== undefined ? config.antiCheatEnabled : true}
            onChange={(e) => setConfig({ ...config, antiCheatEnabled: e.target.checked })}
            label="Anti-Cheat (Deteksi Tab Switch)"
            description="Aktifkan deteksi saat siswa pindah tab/browser. 3x pindah tab akan dikunci 15 detik"
            accentColor="rose"
          />
        </div>
      </SectionCard>

      {/* ═══ STATUS SUMMARY ═══ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Status", value: config.isActive ? "Aktif" : "Nonaktif", icon: config.isActive ? "fa-check-circle" : "fa-times-circle", iconBg: config.isActive ? "bg-green-50" : "bg-slate-100", iconColor: config.isActive ? "text-green-600" : "text-slate-400" },
          { label: "Token", value: config.token || "Tidak ada", icon: "fa-key", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Durasi", value: `${config.duration} menit`, icon: "fa-clock", iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
                <div className="mt-1.5 text-xl font-bold text-slate-900">{s.value}</div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.iconBg}`}>
                <i className={`fas ${s.icon} text-xl ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ PREVIEW UJIAN ═══ */}
      {onPreview && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <i className="fas fa-eye text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">Preview Ujian</h3>
          </div>
          <p className="mb-4 text-xs text-amber-700">
            Pilih subtes atau mapel yang ingin dipreview. Data jawaban pada mode preview tidak akan disimpan.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={previewTarget}
              onChange={(e) => setPreviewTarget(e.target.value)}
              className="input flex-1 border-amber-300 bg-white font-semibold text-amber-900 focus:border-amber-500 focus:ring-amber-200"
            >
              <optgroup label="Tes Kemampuan Akademik (TKA)">
                <option value="literasi">Literasi</option>
                <option value="numerasi">Numerasi</option>
              </optgroup>
              <optgroup label="Mata Pelajaran (MAPEL)">
                {MAPEL_LIST.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
            </select>
            <button
              type="button"
              onClick={() => onPreview(previewTarget)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 hover:border-emerald-600 md:w-auto w-full"
            >
              <i className="fas fa-play" /> Mulai Preview
            </button>
          </div>
        </div>
      )}

      {/* ═══ SAVE BUTTON ═══ */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-4 text-base font-bold text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <i className={`fas ${isSaving ? "fa-spinner fa-spin" : "fa-save"} mr-2`} />
        {isSaving ? "Menyimpan Pengaturan..." : "Simpan Semua Pengaturan"}
      </button>

      {/* ═══ BACKUP ═══ */}
      <BackupPanel />

      {/* ═══ DANGER ZONE ═══ */}
      <div className="overflow-hidden rounded-3xl border-2 border-red-200 bg-red-50 p-6 md:p-8 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
            <i className="fas fa-triangle-exclamation text-sm text-red-600" />
          </div>
          <h3 className="text-base font-bold text-red-700">Zona Berbahaya</h3>
        </div>
        <p className="mb-5 text-xs text-red-500">
          Tindakan di bawah ini bersifat <strong>permanen</strong> dan tidak dapat dibatalkan.
        </p>

        <div className="space-y-3">
          {[
            { key: "questions", collection: "questions", label: "Soal", desc: "Hapus seluruh bank soal dari database.", icon: "fa-book", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
            { key: "results", collection: "results", label: "Nilai / Hasil Ujian", desc: "Hapus seluruh rekap hasil ujian siswa.", icon: "fa-chart-bar", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
            { key: "students", collection: "students", label: "Data Siswa", desc: "Hapus seluruh akun dan data siswa.", icon: "fa-users", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-4 rounded-xl border border-red-200 bg-white px-4 py-3.5 shadow-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                <i className={`fas ${item.icon} text-sm ${item.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800">Hapus Semua {item.label}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
              <button
                type="button"
                disabled={deleting[item.key]}
                onClick={() => handleBulkDelete(item.collection, item.label, item.key)}
                className="shrink-0 flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting[item.key] ? (
                  <><i className="fas fa-spinner fa-spin" /> Menghapus...</>
                ) : (
                  <><i className="fas fa-trash-alt" /> Hapus Semua</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
