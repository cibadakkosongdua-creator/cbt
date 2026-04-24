import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import { toastSuccess, toastError } from "../../lib/notify";
import PageHeader from "../../components/admin/PageHeader";
import { getAvatarGrad, getInitials } from "../../lib/avatarUtils";

const LiveMonitor = () => {
  const [sessions, setSessions] = useState([]);
  const [presenceData, setPresenceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [kelasFilter, setKelasFilter] = useState("all");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase.from("sessions").select("*, students(photo_url, active_border)");
    if (!error) setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    
    // 1. Listen to Database Changes (Fallback/Persisted data)
    const dbChannel = supabase
      .channel("sessions-db-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => fetchSessions())
      .subscribe();

    // 2. Realtime Presence (Live Status)
    const presenceChannel = supabase.channel("exam-presence");
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        setPresenceData(presenceChannel.presenceState());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  const getIdleSeconds = (session) => {
    const lastActive = session.last_active || session.started_at;
    if (!lastActive) return 999999;
    const last = new Date(lastActive).getTime();
    return Math.floor((now - last) / 1000);
  };

  const getStatus = (studentId) => {
    const isOnline = Object.values(presenceData).some(p => p.some(u => u.user_id === studentId));
    if (isOnline) return "online";
    
    const session = sessions.find(s => s.student_id === studentId);
    if (!session) return "offline";

    const idleSec = getIdleSeconds(session);
    
    if (idleSec > 120) return "offline";
    if (idleSec > 45) return "idle";
    return "online";
  };

  // ─── Derived stats ──────────────────────────────────────
  const stats = useMemo(() => {
    let online = 0,
      idle = 0,
      offline = 0,
      warnings = 0;
    
    sessions.forEach((s) => {
      const status = getStatus(s.student_id);
      if (status === "online") online += 1;
      else if (status === "idle") idle += 1;
      else offline += 1;
      
      if ((s.tab_switches || 0) > 0) warnings += (s.tab_switches || 0);
    });
    return { online, idle, offline, warnings, total: sessions.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, presenceData, now]);

  // Unique classes for filter
  const classOptions = useMemo(() => {
    const set = new Set();
    sessions.forEach((s) => s.kelas && set.add(s.kelas));
    return Array.from(set).sort();
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    if (kelasFilter === "all") return sessions;
    return sessions.filter((s) => s.kelas === kelasFilter);
  }, [sessions, kelasFilter]);

  // ─── Actions ────────────────────────────────────────────
  const handleAddTime = async (session) => {
    const { value: minutes, isConfirmed } = await Swal.fire({
      title: "Tambah Waktu Ujian",
      input: "number",
      inputLabel: "Jumlah menit yang ditambahkan",
      inputPlaceholder: "Contoh: 5",
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: (val) => {
        if (!val || val <= 0) Swal.showValidationMessage("Masukkan angka lebih dari 0");
        return val;
      },
    });
    if (isConfirmed && minutes) {
      try {
        const { error } = await supabase.from("sessions").update({
          time_left: (session.time_left || 0) + parseInt(minutes) * 60,
        }).eq("id", session.id);
        if (error) throw error;
        toastSuccess(`Waktu ${session.student_name} +${minutes} menit`);
      } catch (err) {
        toastError("Gagal: " + err.message);
      }
    }
  };

  const handleForceFinish = async (session) => {
    const idleSec = getIdleSeconds(session);
    const isOffline = idleSec > 120;
    if (isOffline || session.force_submit) {
      const { isConfirmed } = await Swal.fire({
        title: isOffline ? "Hapus Sesi Offline?" : "Hapus Sesi Macet?",
        text: isOffline
          ? `Siswa ${session.student_name} tidak aktif lebih dari 2 menit. Hapus sesi permanen?`
          : `Sesi ${session.student_name} tampaknya macet. Hapus permanen?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Ya, Hapus",
        cancelButtonText: "Batal",
      });
      if (isConfirmed) {
        try {
          const { error } = await supabase.from("sessions").delete().eq("id", session.id);
          if (error) throw error;
          toastSuccess(`Sesi ${session.student_name} dihapus.`);
        } catch (err) {
          toastError("Gagal menghapus sesi: " + err.message);
        }
      }
      return;
    }
    const { isConfirmed } = await Swal.fire({
      title: "Paksa Selesai?",
      text: `Siswa ${session.student_name} akan dipaksa mengakhiri ujian.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Akhiri",
      cancelButtonText: "Batal",
    });
    if (isConfirmed) {
      try {
        const { error } = await supabase.from("sessions").update({ force_submit: true }).eq("id", session.id);
        if (error) throw error;
        toastSuccess(`Perintah dikirim ke ${session.student_name}`);
      } catch (err) {
        toastError("Gagal: " + err.message);
      }
    }
  };

  const handleSendMessage = async (session) => {
    const { value: message, isConfirmed } = await Swal.fire({
      title: "Kirim Pesan ke Siswa",
      input: "text",
      inputLabel: `Pesan untuk ${session.student_name}`,
      inputPlaceholder: "Contoh: Fokus ke soal nomor 5...",
      showCancelButton: true,
      confirmButtonText: "Kirim",
      cancelButtonText: "Batal",
    });
    if (isConfirmed && message) {
      try {
        // Broadcast via Realtime (Instant, no DB write)
        await supabase.channel(`session-${session.id}`).send({
          type: "broadcast",
          event: "admin_message",
          payload: { text: message, sentAt: Date.now() },
        });

        // Tetap simpan ke DB sebagai backup/history
        await supabase.from("sessions").update({
          admin_message: { text: message, sentAt: Date.now() },
        }).eq("id", session.id);

        toastSuccess("Pesan terkirim!");
      } catch (err) {
        toastError("Gagal: " + err.message);
      }
    }
  };

  const handleBroadcastMessage = async () => {
    if (sessions.length === 0) return;
    const { value: message, isConfirmed } = await Swal.fire({
      title: "Pesan ke Semua Siswa",
      text: `Pesan akan dikirim ke ${sessions.length} siswa aktif.`,
      input: "text",
      inputPlaceholder: "Contoh: Sisa waktu 10 menit lagi...",
      showCancelButton: true,
      confirmButtonText: "Kirim Semua",
      cancelButtonText: "Batal",
    });
    if (isConfirmed && message) {
      try {
        // Global Broadcast (Satu kali kirim untuk semua)
        await supabase.channel("exam-presence").send({
          type: "broadcast",
          event: "global_message",
          payload: { text: message, sentAt: Date.now() },
        });

        toastSuccess("Broadcast terkirim!");
      } catch (err) {
        toastError("Gagal broadcast: " + err.message);
      }
    }
  };

  const handleBulkCleanup = async () => {
    const offlineSessions = sessions.filter((s) => getIdleSeconds(s) > 120);
    if (offlineSessions.length === 0) {
      toastSuccess("Tidak ada sesi offline.");
      return;
    }
    const { isConfirmed } = await Swal.fire({
      title: "Bersihkan Sesi Offline?",
      text: `Hapus ${offlineSessions.length} sesi yang tidak aktif?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Bersihkan",
      cancelButtonText: "Batal",
    });
    if (isConfirmed) {
      try {
        await Promise.all(offlineSessions.map((s) => supabase.from("sessions").delete().eq("id", s.id)));
        toastSuccess(`${offlineSessions.length} sesi offline dibersihkan.`);
      } catch (err) {
        toastError("Gagal: " + err.message);
      }
    }
  };

  const fmtTime = (sec = 0) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  const fmtIdleTime = (sec) => {
    if (sec > 86400) return "> 1 hari";
    if (sec > 3600) return `${Math.floor(sec / 3600)} jam`;
    if (sec < 10) return "Baru saja";
    if (sec < 60) return `${sec} dtk`;
    return `${Math.floor(sec / 60)} mnt`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="fa-satellite-dish"
        iconTone="sky"
        title="Live Monitor"
        subtitle="Pantau dan kelola aktivitas ujian siswa secara real-time"
        badge={
          stats.total > 0
            ? { label: `${stats.total} Sesi`, tone: "sky", icon: "fa-circle" }
            : null
        }
        actions={
          <>
            <button
              onClick={handleBroadcastMessage}
              disabled={sessions.length === 0}
              className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-600 border border-indigo-100 transition hover:bg-indigo-100 disabled:opacity-50"
            >
              <i className="fas fa-bullhorn" /> Broadcast
            </button>
            <button
              onClick={handleBulkCleanup}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 transition hover:bg-slate-200"
            >
              <i className="fas fa-broom" /> Bersihkan Offline
            </button>
          </>
        }
      />

      {/* ══════ LIVE STATS STRIP ══════ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatPill
          icon="fa-circle-dot"
          tone="emerald"
          label="Online"
          value={stats.online}
          pulse
        />
        <StatPill
          icon="fa-hourglass-half"
          tone="amber"
          label="Diam"
          value={stats.idle}
        />
        <StatPill
          icon="fa-plug-circle-xmark"
          tone="slate"
          label="Offline"
          value={stats.offline}
        />
        <StatPill
          icon="fa-triangle-exclamation"
          tone={stats.warnings > 0 ? "rose" : "slate"}
          label="Pelanggaran"
          value={stats.warnings}
        />
      </div>

      {/* ══════ CLASS FILTER ══════ */}
      {classOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Filter Kelas
          </span>
          <button
            onClick={() => setKelasFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              kelasFilter === "all"
                ? "bg-indigo-600 text-white shadow"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semua
          </button>
          {classOptions.map((k) => (
            <button
              key={k}
              onClick={() => setKelasFilter(k)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                kelasFilter === k
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* ══════ CONTENT ══════ */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-[22px] bg-white border border-slate-200" />
          ))}
        </div>
      ) : visibleSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white py-24 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-slate-100 shadow-inner">
            <i className="fas fa-satellite-dish text-3xl text-slate-400" />
          </div>
          <div>
            <div className="font-semibold text-slate-700">
              {kelasFilter === "all"
                ? "Tidak ada siswa yang sedang ujian"
                : `Tidak ada siswa Kelas ${kelasFilter} yang ujian`}
            </div>
            <div className="mt-0.5 text-sm text-slate-400">
              Data akan muncul otomatis saat siswa memulai ujian
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleSessions.map((s) => {
            const progress =
              s.total_questions > 0
                ? Math.round(((s.current_index + 1) / s.total_questions) * 100)
                : 0;
            const isLowTime = (s.time_left || 0) < 300;
            const idleSec = getIdleSeconds(s);
            const isOffline = idleSec > 120;
            const isIdle = idleSec > 45 && idleSec <= 120;

            // Status accent for border & progress
            const accent = isOffline
              ? { border: "border-slate-200", bg: "bg-slate-50/50", progress: "bg-slate-400" }
              : isIdle
              ? { border: "border-amber-200", bg: "bg-white", progress: "bg-amber-400" }
              : { border: "border-slate-200", bg: "bg-white", progress: "bg-gradient-to-r from-indigo-500 to-violet-500" };

            return (
              <div
                key={s.id}
                className={`relative overflow-hidden rounded-[22px] border transition-all duration-300 shadow-sm ${accent.border} ${accent.bg} ${isOffline ? "opacity-75" : "hover:shadow-md"}`}
              >
                {isOffline && (
                  <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm py-1 text-[10px] font-bold text-slate-500">
                    <i className="fas fa-plug-circle-xmark mr-1.5" />
                    KEMUNGKINAN OFFLINE / TAB DITUTUP
                  </div>
                )}

                <div className={`p-5 ${isOffline ? "pt-8" : ""}`}>
                  {/* ─── Identity Row ─── */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-2 ring-slate-50 transition-transform hover:scale-105">
                        {(s.photo_url || s.photoURL || s.students?.photo_url) ? (
                          <img src={s.photo_url || s.photoURL || s.students?.photo_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGrad(s.student_name)} text-xs font-black uppercase text-white`}>
                            {getInitials(s.student_name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="font-bold text-slate-900 leading-tight truncate text-sm sm:text-base"
                            title={s.student_name}
                          >
                            {s.student_name || "–"}
                          </div>
                          {isOffline ? (
                            <span className="flex h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                          ) : isIdle ? (
                            <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                          ) : (
                            <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                          <span className="font-medium">Kelas {s.kelas || "–"}</span>
                          <span className="text-slate-300">•</span>
                          <span className={idleSec > 30 ? "text-amber-600 font-semibold" : ""}>
                            Diam: {fmtIdleTime(idleSec)}
                          </span>
                        </div>
                        {/* Tab switches & Device info moved here for better nesting */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {s.tab_switches > 0 && (
                            <span
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                s.tab_switches > 3
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}
                            >
                              <i className="fas fa-triangle-exclamation" />
                              {s.tab_switches}x Pindah Tab
                            </span>
                          )}
                          <span className="flex items-center gap-1 rounded-md bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            <i className={`fas ${s.device === "mobile" ? "fa-mobile-screen" : "fa-laptop"}`} />
                            {s.device === "mobile" ? "HP" : "PC"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                          (s.subtes || "literasi") === "literasi"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-orange-50 text-orange-700 border border-orange-100"
                        }`}
                      >
                        {(s.subtes || "literasi") === "literasi" ? "Lit" : "Num"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                          s.mode === "latihan"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}
                      >
                        {s.mode === "latihan" ? "Lat" : "TO"}
                      </span>
                    </div>
                  </div>

                  {/* ─── Progress ─── */}
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                    <span>Soal {(s.current_index || 0) + 1} / {s.total_questions || "?"}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${accent.progress}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* ─── Timer ─── */}
                  {s.mode !== "latihan" && (
                    <div
                      className={`mt-3 flex items-center gap-1.5 text-xs font-bold tabular-nums ${
                        isLowTime ? "text-red-600" : "text-slate-600"
                      }`}
                    >
                      <i className={`fas fa-clock text-xs ${isLowTime ? "animate-pulse" : ""}`} />
                      {fmtTime(s.time_left)} tersisa
                    </div>
                  )}

                  {/* ─── Remote Actions ─── */}
                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                    {s.force_submit ? (
                      <div className="flex-1 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                        <i className="fas fa-sync fa-spin text-[10px]" />
                        <span className="truncate">Menunggu Selesai...</span>
                        <button
                          onClick={() => handleForceFinish(s)}
                          className="ml-auto text-red-700 hover:text-red-900 underline shrink-0"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSendMessage(s)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 transition hover:bg-blue-100 disabled:opacity-50"
                            title="Kirim Pesan"
                            disabled={isOffline}
                          >
                            <i className="fas fa-comment-dots text-sm" />
                          </button>
                          <button
                            onClick={() => handleAddTime(s)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 transition hover:bg-amber-100 disabled:opacity-50"
                            title="Tambah Waktu"
                            disabled={isOffline}
                          >
                            <i className="fas fa-hourglass-half text-sm" />
                          </button>
                        </div>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleForceFinish(s)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold transition shadow-sm ${
                            isOffline
                              ? "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                              : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                          }`}
                        >
                          <i className={`fas ${isOffline ? "fa-trash-can" : "fa-power-off"} text-[10px]`} />
                          <span className="whitespace-nowrap">{isOffline ? "Hapus" : "Selesaikan"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════ Stat Pill ═══════════ */
const TONE_MAP = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", dot: "bg-slate-400" },
  rose: { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
};
const StatPill = ({ icon, tone = "slate", label, value, pulse = false }) => {
  const c = TONE_MAP[tone] || TONE_MAP.slate;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border ${c.border} ${c.bg} p-4`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border ${c.border}`}>
        <i className={`fas ${icon} text-sm ${c.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-2xl font-black tabular-nums ${c.text}`}>{value}</span>
          {pulse && value > 0 && <span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse`} />}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      </div>
    </div>
  );
};

export default LiveMonitor;
