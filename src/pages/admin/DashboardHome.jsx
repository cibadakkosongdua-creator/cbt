/* eslint-disable no-unused-vars */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getPassScore } from "../../lib/examConfig";
import EmptyState from "../../ui/EmptyState";
import { AnimatedNumber } from "../../lib/useAnimatedCounter";
import { motion } from "framer-motion";
import PassRateRing from "../../components/admin/PassRateRing";
import ClassPerformance from "../../components/admin/ClassPerformance";
import QuickActionsCard from "../../components/admin/QuickActionsCard";
import { getAvatarGrad, getInitials } from "../../lib/avatarUtils";

const DashboardHome = ({
  stats,
  recentResults,
  sessions = [],
  loading,
  examConfig,
  setExamConfig,
  allResults = [],
  adminName = "Admin",
}) => {
  const navigate = useNavigate();
  const passScore = getPassScore(examConfig);
  const activeCount = sessions.length;

  /* ── Derived stats ── */
  const { avgScore, passRate, totalValid } = useMemo(() => {
    const valid = allResults.filter((r) => r.score != null && r.mode !== "latihan");
    if (!valid.length) return { avgScore: 0, passRate: 0, totalValid: 0 };
    const sum = valid.reduce((s, r) => s + (r.score || 0), 0);
    const passed = valid.filter((r) => (r.score || 0) >= passScore).length;
    return {
      avgScore: Math.round(sum / valid.length),
      passRate: Math.round((passed / valid.length) * 100),
      totalValid: valid.length,
    };
  }, [allResults, passScore]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ═══════════ HERO — LIGHT, MATCHES APP THEME ═══════════ */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 md:p-8 shadow-sm animate-fade-in-up">
        {/* Subtle decorative pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgb(99 102 241 / 0.06) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-indigo-500">
              {today}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              {getGreeting()}, {adminName.split(" ")[0]}
            </h1>
            <p className="mt-1.5 max-w-lg text-sm font-medium text-slate-500">
              Pantau aktivitas ujian, bank soal, dan performa siswa dari satu tempat.
            </p>

            {/* Status chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
                  examConfig.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    examConfig.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {examConfig.isActive ? "Ujian Aktif" : "Ujian Nonaktif"}
              </span>
              {examConfig.token && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-bold text-indigo-700">
                  <i className="fas fa-key text-[9px]" />
                  Token: <span className="tracking-widest">{examConfig.token}</span>
                </span>
              )}
              {activeCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                    <i className="fas fa-satellite-dish text-[9px]" />
                    {activeCount} siswa live
                  </span>
                  {/* Live Avatars Bubble */}
                  <div className="flex -space-x-2 overflow-hidden py-1">
                    {sessions.slice(0, 5).map((s, i) => (
                      <div
                        key={s.id}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white overflow-hidden bg-white shadow-sm transition-transform hover:scale-110 hover:z-10"
                        title={s.student_name}
                      >
                        {(s.photo_url || s.students?.photo_url) ? (
                          <img src={s.photo_url || s.students?.photo_url} alt="S" className="h-full w-full object-cover" />
                        ) : (
                          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGrad(s.student_name)} text-[8px] font-black text-white`}>
                            {getInitials(s.student_name)}
                          </div>
                        )}
                      </div>
                    ))}
                    {activeCount > 5 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[9px] font-bold text-slate-500">
                        +{activeCount - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
            <button
              onClick={() => navigate("/admin/monitoring?tab=live")}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-sm"
            >
              <i className="fas fa-satellite-dish text-xs" /> Live Monitor
            </button>
            <button
              onClick={() => navigate("/admin/system?tab=settings")}
              className="flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-all"
            >
              <i className="fas fa-sliders text-xs" /> Pengaturan
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ QUICK STATS ═══════════ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: "Siswa Live",
            value: activeCount,
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            icon: "fa-satellite-dish",
            onClick: () => navigate("/admin/monitoring?tab=live"),
          },
          {
            label: "Telah Ujian",
            value: allResults.length,
            bg: "bg-blue-50",
            text: "text-blue-600",
            icon: "fa-clipboard-check",
            onClick: () => navigate("/admin/monitoring?tab=results"),
          },
          {
            label: "Rata-Rata",
            value: `${avgScore}%`,
            bg: "bg-amber-50",
            text: "text-amber-600",
            icon: "fa-star",
          },
          {
            label: "Bank Soal",
            value: stats?.questions || 0,
            bg: "bg-violet-50",
            text: "text-violet-600",
            icon: "fa-layer-group",
            onClick: () => navigate("/admin/questions"),
          },
        ].map((s, idx) => (
          <motion.button
            key={s.label}
            type="button"
            onClick={s.onClick}
            disabled={!s.onClick}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.06 }}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <i
              className={`fas ${s.icon} absolute -bottom-5 -right-3 text-[90px] ${s.text} opacity-[0.06] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 pointer-events-none`}
            />
            <div className="relative flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg} ${s.text}`}
              >
                <i className={`fas ${s.icon} text-base`} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {s.label}
                </div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-slate-900">
                  {loading ? "–" : typeof s.value === "number" ? (
                    <AnimatedNumber value={s.value} />
                  ) : (
                    s.value
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* ═══════════ BENTO: MAIN GRID ═══════════ */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── LEFT: Class Performance (2 cols) ── */}
        <Panel
          className="lg:col-span-2"
          title="Performa per Kelas"
          subtitle="Rata-rata nilai tryout"
          icon="fa-chart-column"
          accent="indigo"
          action={
            allResults.length > 0 && (
              <button
                onClick={() => navigate("/admin/monitoring?tab=results")}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
              >
                Detail <i className="fas fa-arrow-right text-[9px] ml-0.5" />
              </button>
            )
          }
        >
          <ClassPerformance
            results={allResults}
            passScore={passScore}
            loading={loading}
          />
        </Panel>

        {/* ── RIGHT: Pass Rate Ring ── */}
        <Panel
          title="Tingkat Kelulusan"
          subtitle={`Min. nilai KKM ${passScore}`}
          icon="fa-bullseye"
          accent="emerald"
        >
          <PassRateRing
            passRate={passRate}
            totalSubmissions={totalValid}
            passScore={passScore}
          />
        </Panel>
      </div>

      {/* ═══════════ BENTO: OPS ROW ═══════════ */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Quick Actions ── */}
        <Panel
          title="Aksi Cepat"
          subtitle="Tidak perlu buka Pengaturan"
          icon="fa-bolt"
          accent="amber"
        >
          <QuickActionsCard examConfig={examConfig} setExamConfig={setExamConfig} activeCount={activeCount} />
        </Panel>

        {/* ── Recent Submissions (2 cols) ── */}
        <Panel
          className="lg:col-span-2"
          title="Penyerahan Terbaru"
          subtitle="Siswa yang baru saja selesai ujian"
          icon="fa-inbox"
          accent="blue"
          action={
            recentResults.length > 0 && (
              <button
                onClick={() => navigate("/admin/monitoring?tab=results")}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
              >
                Lihat Semua <i className="fas fa-arrow-right text-[9px] ml-0.5" />
              </button>
            )
          }
        >
          {loading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : recentResults.length === 0 ? (
            <EmptyState
              icon="fa-inbox"
              title="Belum Ada Hasil Terbaru"
              description="Penyerahan siswa akan muncul di sini"
              size="small"
              isTable={false}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recentResults.slice(0, 6).map((r) => {
                const passed = (r.score || 0) >= passScore;
                return (
                  <div
                    key={r.id}
                    className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-indigo-100 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-2 ring-slate-50 transition-transform group-hover:scale-105">
                        {(r.photoURL || r.photo_url || r.students?.photo_url) ? (
                          <img src={r.photoURL || r.photo_url || r.students?.photo_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGrad(r.studentName)} text-[11px] font-black uppercase text-white`}>
                            {getInitials(r.studentName)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                          {r.studentName}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Kelas {r.kelas || "-"}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-black tabular-nums ${
                        passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.score}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

/* ── Reusable Panel wrapper ── */
const Panel = ({ title, subtitle, icon, accent = "indigo", action, children, className = "" }) => {
  const palette = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    violet: { bg: "bg-violet-50", text: "text-violet-600" },
  }[accent];

  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${palette.bg} ${palette.text}`}
          >
            <i className={`fas ${icon} text-sm`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black tracking-tight text-slate-900">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
};

export default DashboardHome;
