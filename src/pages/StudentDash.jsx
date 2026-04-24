import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { playSound } from "../lib/soundUtils";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import Page from "../ui/Page";
import Container from "../ui/Container";
import MobileDock from "../ui/MobileDock";
import AppLauncher from "../ui/AppLauncher";
import NotificationCenter from "../ui/NotificationCenter";
import Swal from "sweetalert2";
import { DEFAULT_EXAM_CONFIG } from "../lib/examConfig";
import { ALL_ITEMS } from "../lib/achievements";
import { getAvatarGrad, getInitials } from "../lib/avatarUtils";
import { motion, AnimatePresence } from "framer-motion";
import HomeTab from "./student/HomeTab";
import HistoryTab from "./student/HistoryTab";
import RankingTab from "./student/RankingTab";
import ProfileTab from "./student/ProfileTab";

/* ── Notification helpers ────────────────────────────── */
const NOTIF_SEEN_KEY = "cbt_student_notif_seen_ids";
const NOTIF_TS_KEY = "cbt_student_notif_seen_ts";

const getReadNotifIds = () => {
  try { return JSON.parse(localStorage.getItem(NOTIF_SEEN_KEY) || "[]"); }
  catch { return []; }
};

const saveReadNotifId = (id) => {
  try {
    const ids = getReadNotifIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(NOTIF_SEEN_KEY, JSON.stringify(ids.slice(-100)));
    }
  } catch { /* noop */ }
};

const getSeenTimestamp = () => {
  try { return parseInt(localStorage.getItem(NOTIF_TS_KEY) || "0", 10); }
  catch { return 0; }
};

const setSeenTimestamp = (ts) => {
  try {
    localStorage.setItem(NOTIF_TS_KEY, String(ts));
    localStorage.setItem(NOTIF_SEEN_KEY, "[]");
  } catch { /* noop */ }
};

/* ── component ───────────────────────────────────────── */
const StudentDash = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, updateUser } = useAuthStore();
  const [selectedMode, setSelectedMode] = useState("tryout");

  /* ── Sync user data from DB ─────────────────────────── */
  useEffect(() => {
    if (!user?.id) return;
    const syncUser = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("photo_url, active_border, xp")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        // Update store if different
        if (data.photo_url !== user.photoURL || 
            data.active_border !== user.activeBorder ||
            data.xp !== user.xp) {
          updateUser({
            photoURL: data.photo_url,
            activeBorder: data.active_border,
            xp: data.xp
          });
        }
      }
    };
    syncUser();

    // Subscribe to changes
    const channel = supabase
      .channel(`student-sync-${user.id}`)
      .on("postgres_changes", 
          { event: "UPDATE", schema: "public", table: "students", filter: `id=eq.${user.id}` },
          (payload) => {
            updateUser({
              photoURL: payload.new.photo_url,
              activeBorder: payload.new.active_border,
              xp: payload.new.xp
            });
          }
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const active = useMemo(() => {
    const path = location.pathname.split("/").pop();
    return path === "dashboard" ? "home" : path;
  }, [location.pathname]);

  const [history,        setHistory]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [examConfig,     setExamConfig]     = useState({ ...DEFAULT_EXAM_CONFIG });
  const [configLoading,  setConfigLoading]  = useState(true);
  const [leaderboard,    setLeaderboard]    = useState([]);
  const [lbLoading,      setLbLoading]      = useState(false);
  const [notifications,  setNotifications]  = useState([]);
  const [announcements,  setAnnouncements]  = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cbt_dismissed_ann") || "[]"); }
    catch { return []; }
  });

  const tabs = [
    { id: "home",    label: "Beranda",  icon: "fa-house",              path: "/dashboard" },
    { id: "history", label: "Riwayat",  icon: "fa-clock-rotate-left",  path: "/dashboard/history" },
    { id: "ranking", label: "Ranking",  icon: "fa-trophy",             path: "/dashboard/ranking" },
    { id: "profile", label: "Profil",   icon: "fa-user",               path: "/dashboard/profile" },
  ];

  const handleTabChange = (tabId) => {
    playSound("click");
    const item = tabs.find((m) => m.id === tabId);
    if (item) navigate(item.path);
  };

  /* ── Live config ─────────────────────────────────────── */
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
        if (error) throw error;
        if (data) {
          console.log("[CBT] Config raw from DB:", data);
          const normalized = {
            ...DEFAULT_EXAM_CONFIG,
            ...data,
            // Map snake_case from DB to camelCase used in app
            examType: data.exam_type || data.examType || DEFAULT_EXAM_CONFIG.examType,
            activeMapel: data.active_mapel || data.activeMapel || DEFAULT_EXAM_CONFIG.activeMapel,
            isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : DEFAULT_EXAM_CONFIG.isActive),
            duration: data.duration || DEFAULT_EXAM_CONFIG.duration,
            token: data.token || DEFAULT_EXAM_CONFIG.token,
            randomizeQuestions: data.randomize_questions !== undefined ? data.randomize_questions : (data.randomizeQuestions !== undefined ? data.randomizeQuestions : DEFAULT_EXAM_CONFIG.randomizeQuestions),
            showResults: data.show_results !== undefined ? data.show_results : (data.showResults !== undefined ? data.showResults : DEFAULT_EXAM_CONFIG.showResults),
            startAt: data.start_at || data.startAt || DEFAULT_EXAM_CONFIG.startAt,
            endAt: data.end_at || data.endAt || DEFAULT_EXAM_CONFIG.endAt,
          };
          console.log("[CBT] Normalized Config:", normalized.examType);
          setExamConfig(normalized);
        }
      } catch (err) {
        console.error("[CBT] fetchConfig error:", err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();

    const settingsChannel = supabase
      .channel("settings-student-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, (payload) => {
        console.log("[CBT] Config real-time raw:", payload.new);
        const data = payload.new;
        const normalized = {
          ...DEFAULT_EXAM_CONFIG,
          ...data,
          examType: data.exam_type || data.examType || DEFAULT_EXAM_CONFIG.examType,
          activeMapel: data.active_mapel || data.activeMapel || DEFAULT_EXAM_CONFIG.activeMapel,
          isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : DEFAULT_EXAM_CONFIG.isActive),
          duration: data.duration || DEFAULT_EXAM_CONFIG.duration,
          token: data.token || DEFAULT_EXAM_CONFIG.token,
          randomizeQuestions: data.randomize_questions !== undefined ? data.randomize_questions : (data.randomizeQuestions !== undefined ? data.randomizeQuestions : DEFAULT_EXAM_CONFIG.randomizeQuestions),
          showResults: data.show_results !== undefined ? data.show_results : (data.showResults !== undefined ? data.showResults : DEFAULT_EXAM_CONFIG.showResults),
          startAt: data.start_at || data.startAt || DEFAULT_EXAM_CONFIG.startAt,
          endAt: data.end_at || data.endAt || DEFAULT_EXAM_CONFIG.endAt,
        };
        
        // Add notification if exam just became active
        if (normalized.isActive) {
          setNotifications(prev => {
            const id = `config:active:${Date.now()}`;
            // Avoid duplicate active notifications
            if (prev.some(n => n.type === "exam_open")) return prev;
            return [{
              id,
              type: "exam_open",
              title: "Ujian Telah Dibuka!",
              body: `${normalized.examType === "TKA" ? "Latihan AKM" : normalized.activeMapel} sudah bisa dikerjakan sekarang.`,
              time: new Date(),
              read: false
            }, ...prev];
          });
        }

        console.log("[CBT] Real-time Normalized:", normalized.examType);
        setExamConfig(normalized);
      })
      .subscribe();
    return () => supabase.removeChannel(settingsChannel);
  }, []);

  /* ── Announcements ───────────────────────────────────── */
  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (!error) setAnnouncements(data || []);
  };

  useEffect(() => {
    fetchAnnouncements();
    const channel = supabase
      .channel("announcements-student-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => fetchAnnouncements())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  /* ── Own results ─────────────────────────────────────── */
  const fetchOwnResults = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", user.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      
      const rData = (data || []).map((r) => ({
        ...r,
        submittedAt: r.submitted_at ? new Date(r.submitted_at) : new Date(),
      }));
      setHistory(rData);
      
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;
      const seenTs = getSeenTimestamp();
      const readIds = getReadNotifIds();

      const resultNotifs = data
        .filter((r) => new Date(r.submitted_at || r.created_at).getTime() > cutoff)
        .map((r) => {
          const id = `result:${r.id}`;
          const ts = new Date(r.submitted_at || r.created_at).getTime();
          return {
            id,
            type: "result_available",
            title: `Hasil ${r.exam_name || "ujian"} tersedia`,
            body: `Skor: ${r.score ?? 0}% · ${r.correct ?? 0}/${r.total ?? 0} benar`,
            time: r.submitted_at ? new Date(r.submitted_at) : new Date(),
            read: ts <= seenTs || readIds.includes(id),
          };
        });
      setNotifications((prev) => {
        const configNotifs = prev.filter((n) => n.id.startsWith("config:"));
        return [...configNotifs, ...resultNotifs];
      });
    } catch (err) {
      console.error("[CBT] fetchOwnResults error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnResults();
    const channel = supabase
      .channel("results-student-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "results", filter: `student_id=eq.${user?.id}` }, () => fetchOwnResults())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const handleMarkRead = useCallback((id) => {
    saveReadNotifId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    const now = Date.now();
    setSeenTimestamp(now);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  /* ── Leaderboard ─────────────────────────────────────── */
  const [rankingFilter, setRankingFilter] = useState({ type: "TKA", subtes: "SEMUA" }); // Default to TKA for now as requested

  const fetchLeaderboard = async (filter = rankingFilter) => {
    setLbLoading(true);
    try {
      console.log("[CBT] Fetching leaderboard for:", filter);
      
      // Jika filter subtes adalah 'literasi' atau 'numerasi', paksa type ke 'TKA' 
      // untuk menangani data lama yang mungkin salah kategori
      const effectiveType = (filter.subtes === "literasi" || filter.subtes === "numerasi") ? "TKA" : filter.type;

      let query = supabase
        .from("results")
        .select(`
          student_id,
          student_name,
          kelas,
          score,
          subtes,
          exam_type,
          submitted_at,
          students (
            photo_url,
            active_border
          )
        `)
        .eq("mode", "tryout");

      // Logika Filter yang lebih fleksibel
      if (filter.subtes !== "SEMUA") {
        query = query.ilike("subtes", filter.subtes);
      } else {
        query = query.ilike("exam_type", effectiveType);
      }

      const { data: lbData, error } = await query
        .order("score", { ascending: false })
        .order("submitted_at", { ascending: false })
        .limit(500); 
      
      if (error) throw error;
      
      const byStudent = {};
      (lbData || []).forEach((r) => {
        const sid = r.student_id;
        if (!sid) return;
        
        if (!byStudent[sid] || Number(r.score) > byStudent[sid].score) {
          byStudent[sid] = {
            studentId: sid,
            studentName: r.student_name,
            kelas: r.kelas,
            score: Number(r.score) || 0,
            subtes: r.subtes,
            submittedAt: r.submitted_at,
            photoURL: r.students?.photo_url,
            activeBorder: r.students?.active_border
          };
        }
      });

      const sortedList = Object.values(byStudent)
        .sort((a, b) => b.score - a.score || new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 10);

      setLeaderboard(sortedList);
    } catch (e) {
      console.error("[CBT] Leaderboard error:", e);
    } finally {
      setLbLoading(false);
    }
  };

  // Auto-fetch when filter changes
  useEffect(() => {
    if (active === "ranking") fetchLeaderboard();
  }, [active, rankingFilter]);

  // Real-time listener for results
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "results" },
        (payload) => {
          // Re-fetch only if the new result matches current filter type
          if (payload.new.mode === 'tryout' && payload.new.exam_type === rankingFilter.type) {
            fetchLeaderboard();
          }
        }
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [rankingFilter]);

  /* ── Start exam flow ─────────────────────────────────── */
  const startExamFlow = async (mapel = "IPAS", mode = "tryout") => {
    if (configLoading) return;
    if (!examConfig.isActive) {
      await Swal.fire({ icon: "info", title: "Ujian belum dibuka", text: "Silakan tunggu sampai ujian diaktifkan oleh admin.", confirmButtonText: "Mengerti" });
      return;
    }
    const now = Date.now();
    const startMs = examConfig.startAt ? Date.parse(examConfig.startAt) : NaN;
    const endMs   = examConfig.endAt   ? Date.parse(examConfig.endAt)   : NaN;
    if (!Number.isNaN(startMs) && now < startMs) {
      await Swal.fire({ icon: "info", title: "Belum waktunya ujian", text: `Ujian dibuka pada ${new Date(startMs).toLocaleString("id-ID")}.` });
      return;
    }
    if (!Number.isNaN(endMs) && now > endMs) {
      await Swal.fire({ icon: "info", title: "Ujian sudah ditutup", text: `Ujian ditutup pada ${new Date(endMs).toLocaleString("id-ID")}.` });
      return;
    }
    if (examConfig.token && examConfig.token.trim()) {
      const res = await Swal.fire({
        title: "Masukkan Token Ujian",
        input: "text",
        inputPlaceholder: "Contoh: UJI2024",
        inputAttributes: { autocapitalize: "characters", autocomplete: "off" },
        showCancelButton: true,
        confirmButtonText: "Mulai",
        cancelButtonText: "Batal",
        preConfirm: (val) => String(val || "").trim().toUpperCase(),
      });
      if (!res.isConfirmed) return;
      const tokenInput    = (res.value || "").toUpperCase();
      const tokenExpected = String(examConfig.token || "").trim().toUpperCase();
      if (tokenInput !== tokenExpected) {
        await Swal.fire({ icon: "error", title: "Token salah", text: "Periksa kembali token ujian." });
        return;
      }
    }
    playSound("success");
    navigate(`/exam?mapel=${encodeURIComponent(mapel)}&mode=${mode}`);
  };

  return (
    <Page>
      {/* ══════════════ TOP NAV BAR ══════════════ */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-[0_1px_12px_rgb(0,0,0,0.04)]">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Logo SDN 02"
                className="h-10 w-10 object-contain drop-shadow-sm transition-transform hover:scale-105"
              />
              <div className="flex flex-col">
                <h1 className="text-sm font-black text-slate-900 leading-none tracking-tight">
                  Smart CBT
                </h1>
                <span className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  SDN 02 Cibadak
                </span>
              </div>
            </div>

            {/* Desktop tab navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    active === t.id
                      ? "bg-white shadow-sm text-indigo-700 shadow-slate-200"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <i className={`fas ${t.icon} text-xs`} />
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <NotificationCenter
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onClearAll={() => { /* logic is inside child via localStorage */ }}
              />
              <AppLauncher />

              {/* Profile Quick View */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-black text-slate-900 leading-tight">
                    {user?.name || "Siswa"}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    NISN: {user?.id}
                  </div>
                </div>
                
                <button 
                  onClick={() => navigate("/dashboard/profile")}
                  className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm transition-transform active:scale-95 ${ALL_ITEMS.borders.find(b => b.id === (user?.activeBorder || "none"))?.class || "ring-2 ring-slate-100"}`}
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGrad(user?.name)} text-white text-sm font-black`}>
                      {getInitials(user?.name)}
                    </div>
                  )}
                </button>
              </div>

              <button
                onClick={logout}
                className="btn btn-ghost btn-icon hidden sm:flex text-slate-400 hover:text-red-500"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt text-sm" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* ══════════════ PAGE CONTENT ══════════════ */}
      <Container className="py-5 pb-28 md:pb-8 md:py-8">
        {/* Announcement Banners */}
        {announcements.filter((a) => !dismissedAnnouncements.includes(a.id)).length > 0 && (
          <div className="mb-5 space-y-2">
            {announcements
              .filter((a) => !dismissedAnnouncements.includes(a.id))
              .map((ann) => {
                const typeStyles = {
                  info:    "border-blue-200 bg-blue-50 text-blue-800",
                  warning: "border-amber-200 bg-amber-50 text-amber-800",
                  success: "border-green-200 bg-green-50 text-green-800",
                };
                const typeIcons = {
                  info:    "fa-circle-info text-blue-500",
                  warning: "fa-triangle-exclamation text-amber-500",
                  success: "fa-circle-check text-green-500",
                };
                return (
                  <div
                    key={ann.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 animate-fade-in ${typeStyles[ann.type] || typeStyles.info}`}
                  >
                    <i className={`fas ${typeIcons[ann.type] || typeIcons.info} mt-0.5 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{ann.title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed opacity-80">{ann.body}</div>
                    </div>
                    <button
                      onClick={() => {
                        playSound("click");
                        const next = [...dismissedAnnouncements, ann.id];
                        setDismissedAnnouncements(next);
                        try { localStorage.setItem("cbt_dismissed_ann", JSON.stringify(next)); } catch {}
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-50 transition hover:opacity-100"
                    >
                      <i className="fas fa-times text-xs" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route index element={
                <HomeTab
                  examConfig={examConfig}
                  configLoading={configLoading}
                  selectedMode={selectedMode}
                  setSelectedMode={setSelectedMode}
                  startExamFlow={startExamFlow}
                  history={history}
                  loading={loading}
                  setActive={(id) => handleTabChange(id)}
                />
              } />
              <Route path="history" element={<HistoryTab history={history} loading={loading} examConfig={examConfig} />} />
              <Route path="ranking" element={
                <RankingTab 
                  leaderboard={leaderboard} 
                  lbLoading={lbLoading} 
                  fetchLeaderboard={fetchLeaderboard} 
                  userId={user?.id}
                  rankingFilter={rankingFilter}
                  setRankingFilter={setRankingFilter}
                />
              } />
              <Route path="profile" element={<ProfileTab user={user} history={history} examConfig={examConfig} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Container>

      {/* Mobile bottom dock */}
      <MobileDock
        items={tabs}
        activeId={active}
        onChange={async (id) => {
          playSound("click");
          if (id === "start")   return startExamFlow(examConfig.activeMapel || "umum");
          if (id === "logout")  return logout();
          if (id === "ranking" && leaderboard.length === 0) fetchLeaderboard();
          handleTabChange(id);
        }}
      />
    </Page>
  );
};

export default StudentDash;
