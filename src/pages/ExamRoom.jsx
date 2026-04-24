import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { calculateScore } from "../lib/scoring";
import { shuffleArray } from "../lib/utils";
import { XP_REWARDS, calculateLevel } from "../lib/achievements";
import Swal from "sweetalert2";
import confetti from "canvas-confetti";
import { playSound } from "../lib/soundUtils";
import Page from "../ui/Page";
import Container from "../ui/Container";
import { DEFAULT_EXAM_CONFIG, getPassScore } from "../lib/examConfig";
import ExamHeader from "./exam/ExamHeader";
import QuestionCard from "./exam/QuestionCard";
import ExamSidebar from "./exam/ExamSidebar";
import ScratchpadOverlay from "./exam/ScratchpadOverlay";
import ExamBottomSheet from "./exam/ExamBottomSheet";
import ShortcutModal from "../ui/ShortcutModal";
import ExamTour from "../components/ExamTour";

const Mascot = ({ message, type = "normal" }) => {
  const avatars = {
    normal: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Lucky",
    warning: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Zoe",
    happy: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Snuggles",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] hidden sm:flex items-end gap-3 animate-bounce-subtle pointer-events-none sm:pointer-events-auto group">
      <div className="relative mb-8 rounded-2xl bg-white p-3 text-[11px] font-bold text-slate-700 shadow-xl ring-1 ring-slate-100 after:absolute after:bottom-[-8px] after:right-4 after:h-4 after:w-4 after:rotate-45 after:bg-white after:ring-b after:ring-r after:ring-slate-100 max-w-[150px]">
        {message}
      </div>
      <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-indigo-50 shadow-2xl ring-4 ring-indigo-100 transition-transform group-hover:scale-110">
        <img src={avatars[type]} alt="Mascot" className="h-full w-full object-cover" />
      </div>
    </div>
  );
};

const ExamRoom = ({
  mapel: propMapel,
  mode: propMode,
  preview = false,
  onExitPreview,
  onFinish,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mapel = propMapel || searchParams.get("mapel") || "IPAS";
  const mode = propMode || searchParams.get("mode") || "tryout";

  // Dynamic Theme Colors based on Mapel
  const getThemeColors = (mapelName) => {
    const name = (mapelName || "").toLowerCase();
    if (name.includes("matematika") || name.includes("mtk")) return "from-blue-500 to-indigo-700";
    if (name.includes("ipa") || name.includes("sains")) return "from-emerald-500 to-teal-700";
    if (name.includes("indonesia")) return "from-orange-500 to-rose-600";
    if (name.includes("inggris")) return "from-purple-500 to-indigo-600";
    if (name.includes("ips") || name.includes("sosial")) return "from-amber-500 to-orange-700";
    return "from-sky-500 to-blue-700"; // Default
  };

  const themeGradient = getThemeColors(mapel);
  
  const { user, updateUser } = useAuthStore();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [doubtful, setDoubtful] = useState({});
  const [timeLeft, setTimeLeft] = useState(3600);
  const [examConfig, setExamConfig] = useState({ ...DEFAULT_EXAM_CONFIG });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [fontSize, setFontSize] = useState("text-lg");
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [slideDir, setSlideDir] = useState("right"); // slide animation direction
  const [runTour, setRunTour] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [lockTime, setLockTime] = useState(0); // Anti-cheat lock duration in seconds
  const [showReadingRuler, setShowReadingRuler] = useState(false);
  const [rulerY, setRulerY] = useState(300);
  const [isDyslexic, setIsDyslexic] = useState(false);

  const initialDurationSecRef = useRef(3600);
  const handleFinishExamRef = useRef(null);
  const timeLeftRef = useRef(timeLeft);
  const touchStartRef = useRef(null);
  const questionAreaRef = useRef(null);

  const [mascotMsg, setMascotMsg] = useState("Semangat ya mengerjakannya!");
  const [mascotType, setMascotType] = useState("normal");

  // Mascot dynamic messages
  useEffect(() => {
    if (isFinished) return;
    
    const unanswered = questions.length - Object.keys(answers).length;
    if (timeLeft <= 300 && timeLeft > 0) {
      setMascotMsg("Ayo semangat, waktu tinggal sedikit lagi!");
      setMascotType("warning");
    } else if (unanswered === 0) {
      setMascotMsg("Wah hebat! Semua soal sudah terisi.");
      setMascotType("happy");
    } else if (unanswered <= 3) {
      setMascotMsg(`Tinggal ${unanswered} soal lagi nih!`);
      setMascotType("normal");
    }
  }, [timeLeft, answers, questions.length, isFinished]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Helper: bintang berdasarkan skor
  const getStars = (score) => {
    const passScore = getPassScore(examConfig);
    if (score >= passScore + 10) return "⭐⭐⭐";
    if (score >= passScore) return "⭐⭐";
    return "⭐";
  };

  // Helper: pesan semangat kontekstual
  const getPesan = (score, currentMapel) => {
    const passScore = getPassScore(examConfig);
    if ((currentMapel || "").toLowerCase().includes("matematika") || (currentMapel || "").toLowerCase().includes("numerasi")) {
      if (score >= passScore + 10) return "Jagoan angka! Hitungan kamu keren banget! 🟠🔢";
      if (score >= passScore)
        return "Hampir sempurna! Terus latihan ya! 🟠💪";
      return "Semangat! Coba lagi soal angkanya, pasti bisa! 🟠";
    }
    if (score >= passScore + 10) return "Luar biasa! Terus semangat belajar ya! 🔵📖";
    if (score >= passScore) return "Sudah bagus! Latihan lagi biar makin mantap! 🔵";
    return "Jangan menyerah! Coba baca pelan-pelan lagi ya! 🔵💪";
  };

  const resumeKey = user?.id ? `cbt:examState:${user.id}` : null;

  // --- BEEP WARNING ---
  const playBeep = useCallback((freq = 880, dur = 0.15, times = 1) => {
    let delay = 0;
    for (let i = 0; i < times; i++) {
      setTimeout(() => {
        try {
          const actx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = actx.createOscillator();
          const g = actx.createGain();
          osc.connect(g);
          g.connect(actx.destination);
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0.35, actx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
          osc.start();
          osc.stop(actx.currentTime + dur);
        } catch {
          // AudioContext not available; silently ignore
        }
      }, delay);
      delay += 350;
    }
  }, []);

  // --- FETCH EXAM CONFIG ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
        if (error) throw error;
        if (data) {
          // Normalize snake_case to camelCase
          setExamConfig({
            ...DEFAULT_EXAM_CONFIG,
            ...data,
            examType: data.exam_type || data.examType || DEFAULT_EXAM_CONFIG.examType,
            activeMapel: data.active_mapel || data.activeMapel || DEFAULT_EXAM_CONFIG.activeMapel,
            isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : DEFAULT_EXAM_CONFIG.isActive),
            minScore: data.min_score !== undefined ? data.min_score : (data.minScore !== undefined ? data.minScore : DEFAULT_EXAM_CONFIG.minScore),
            passingGrade: data.passing_grade || data.passingGrade || DEFAULT_EXAM_CONFIG.passingGrade,
            showResults: data.show_results !== undefined ? data.show_results : (data.showResults !== undefined ? data.showResults : DEFAULT_EXAM_CONFIG.showResults),
            randomizeQuestions: data.randomize_questions !== undefined ? data.randomize_questions : (data.randomizeQuestions !== undefined ? data.randomizeQuestions : DEFAULT_EXAM_CONFIG.randomizeQuestions),
            startAt: data.start_at || data.startAt || DEFAULT_EXAM_CONFIG.startAt,
            endAt: data.end_at || data.endAt || DEFAULT_EXAM_CONFIG.endAt,
          });
        }
      } catch (e) {
        console.error("Error fetching exam config:", e);
      } finally {
        setConfigLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  // --- INITIALIZE TOUR ---
  useEffect(() => {
    if (!preview && questions.length > 0 && configLoaded) {
      if (!localStorage.getItem("cbt_exam_tour_seen")) {
        // Wait a slight delay for UI to settle
        setTimeout(() => setRunTour(true), 1000);
      }
    }
  }, [preview, questions.length, configLoaded]);

  // --- SCHEDULE GATE ---
  useEffect(() => {
    if (!configLoaded) return;
    const now = Date.now();
    const startMs = examConfig.startAt ? Date.parse(examConfig.startAt) : NaN;
    const endMs = examConfig.endAt ? Date.parse(examConfig.endAt) : NaN;
    if (!Number.isNaN(startMs) && now < startMs) {
      Swal.fire(
        "Belum waktunya ujian",
        `Ujian dibuka pada ${new Date(startMs).toLocaleString("id-ID")}.`,
        "info",
      ).then(() => {
        navigate("/");
      });
      return;
    }
    if (!Number.isNaN(endMs) && now > endMs) {
      Swal.fire(
        "Ujian sudah ditutup",
        `Ujian ditutup pada ${new Date(endMs).toLocaleString("id-ID")}.`,
        "info",
      ).then(() => {
        navigate("/");
      });
    }
  }, [configLoaded, examConfig.startAt, examConfig.endAt]);

  // --- DURATION / RESUME ---
  useEffect(() => {
    if (!configLoaded) return;
    const seconds = Math.max(1, Number(examConfig.duration || 60)) * 60;
    initialDurationSecRef.current = seconds;

    if (resumeKey) {
      try {
        const raw = localStorage.getItem(resumeKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.v === 1) {
            if (typeof parsed.currentIndex === "number")
              setCurrentIndex(Math.max(0, parsed.currentIndex));
            if (parsed.answers && typeof parsed.answers === "object")
              setAnswers(parsed.answers);
            if (parsed.doubtful && typeof parsed.doubtful === "object")
              setDoubtful(parsed.doubtful);
            if (typeof parsed.timeLeft === "number")
              setTimeLeft(Math.max(0, parsed.timeLeft));
            if (typeof parsed.fontSize === "string")
              setFontSize(parsed.fontSize);
            return;
          }
        }
      } catch {
        // ignore corrupted state
      }
    }

    setTimeLeft(seconds);
  }, [configLoaded, resumeKey, examConfig.duration]);

  // --- PERSIST AUTOSAVE ---
  useEffect(() => {
    if (!resumeKey) return;
    if (!configLoaded) return;
    const payload = {
      v: 1,
      savedAt: Date.now(),
      currentIndex,
      answers,
      doubtful,
      timeLeft: timeLeftRef.current,
      fontSize,
    };
    try {
      localStorage.setItem(resumeKey, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [resumeKey, configLoaded, currentIndex, answers, doubtful, fontSize]);

  // --- FETCH QUESTIONS ---
  useEffect(() => {
    if (!configLoaded) return;
    const fetchQuestions = async () => {
      try {
        const { data: qData, error } = await supabase.from("questions").select("*");
        if (error) throw error;
        let data = qData || [];

        // Filter soal berdasarkan mapel
        data = data.filter((q) => {
          const qMapel = q.subtes || "IPAS";
          return qMapel.toLowerCase() === mapel.toLowerCase();
        });

        if (examConfig.randomizeQuestions) {
          console.log("[ExamRoom] Randomizing questions...");
          data = shuffleArray(data);
        }

        // Process and shuffle questions
        data = data.map((q) => {
          if (q._processed) return q;

          const processedQ = { ...q, _processed: true };

          if ((q.type === "PG" || q.type === "PGK") && q.options) {
            const originalOptions = Array.isArray(q.options) ? q.options : [];
            
            // Simpan teks asli dan index asli agar mapping jawaban selalu sinkron dengan DB
            const optionsWithOriginalIndex = originalOptions.map((opt, idx) => ({
              text: opt,
              originalIdx: idx,
            }));
            
            // Acak tampilan saja, index asli tetap menempel di objek opsi
            processedQ.options = shuffleArray([...optionsWithOriginalIndex]);
            // PENTING: Jangan ubah processedQ.answer! Biarkan tetap sesuai index asli dari DB.
          }
          return processedQ;
        });

        setQuestions(data);

        // Tulis sesi live monitor (skip jika preview)
        if (!preview && user?.id) {
          supabase.from("sessions").upsert({
            id: user.id,
            student_id: user.id,
            student_name: user.name || "",
            kelas: user.kelas || "",
            subtes: mapel,
            mode,
            current_index: 0,
            total_questions: data.length,
            time_left: initialDurationSecRef.current,
            started_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            tab_switches: 0,
            device: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "mobile" : "desktop",
          }).then(() => {}).catch(() => {});
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        Swal.fire("Error", "Tidak bisa memuat soal", "error");
      }
    };
    fetchQuestions();
    return () => {
      if (!preview && user?.id) {
        supabase.from("sessions").delete().eq("id", user.id).then(() => {}).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded, mapel]); // Update dependency agar menunggu configLoaded

  // Update sesi saat ganti soal & Heartbeat berkala (30s)
  useEffect(() => {
    if (preview || !user?.id || questions.length === 0) return;

    const updateSession = async (isHeartbeat = false) => {
      if (!isHeartbeat) setIsSyncing(true);
      try {
        await supabase.from("sessions").update({
          current_index: currentIndex,
          time_left: timeLeftRef.current,
          last_active: new Date().toISOString(),
        }).eq("id", user.id);
        if (!isHeartbeat) {
          setTimeout(() => setIsSyncing(false), 800);
        }
      } catch {
        setIsSyncing(false);
      }
    };

    // Update segera saat currentIndex berubah
    updateSession();

    // Setup interval heartbeat
    const intervalId = setInterval(() => updateSession(true), 30000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions.length]);

  // --- REMOTE CONTROL LISTENER ---
  useEffect(() => {
    if (preview || !user?.id) return;

    // 1. Channel khusus untuk siswa ini (Personal Message/Control)
    const personalChannel = supabase
      .channel("session-" + user.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${user.id}` }, (payload) => {
        const data = payload.new;
        if (!data) return;

        // Force Submit via DB update
        if (data.force_submit) {
          Swal.fire({
            title: "Ujian Dihentikan",
            text: "Admin telah memaksa mengakhiri ujian Anda. Hasil akan segera diproses.",
            icon: "info",
            timer: 3000,
            showConfirmButton: false,
            allowOutsideClick: false,
          }).then(() => {
            handleFinishExamRef.current?.(true);
          });
        }

        // Time Sync
        if (data.time_left !== undefined && Math.abs(data.time_left - timeLeftRef.current) > 10) {
          setTimeLeft(data.time_left);
        }
      })
      .on("broadcast", { event: "admin_message" }, ({ payload }) => {
        // Instant message via Broadcast
        if (payload.sentAt > (window._lastMsgAt || 0)) {
          window._lastMsgAt = payload.sentAt;
          Swal.fire({
            title: "Pesan dari Admin",
            text: payload.text,
            icon: "info",
            confirmButtonColor: "#4f46e5",
          });
          playBeep(440, 0.3, 1);
        }
      })
      .subscribe();

    // 2. Channel Global (Presence & Broadcast untuk semua)
    const globalChannel = supabase.channel("exam-presence");
    globalChannel
      .on("presence", { event: "sync" }, () => {
        const state = globalChannel.presenceState();
        const myFingerprint = user.fingerprint || localStorage.getItem("cbt_device_fingerprint");
        
        // Cari apakah ada user_id yang sama tapi fingerprint berbeda
        const sessions = Object.values(state).flat();
        const duplicate = sessions.find(s => s.user_id === user.id && s.fingerprint !== myFingerprint);
        
        if (duplicate) {
          Swal.fire({
            title: "Sesi Ganda Terdeteksi",
            text: "Akun Anda telah login di perangkat lain. Halaman ini akan ditutup.",
            icon: "error",
            allowOutsideClick: false,
            showConfirmButton: true,
            confirmButtonText: "Keluar",
          }).then(() => {
            navigate("/");
            window.location.reload(); // Paksa reload untuk clear state
          });
        }
      })
      .on("broadcast", { event: "global_message" }, ({ payload }) => {
        if (payload.sentAt > (window._lastGlobalMsgAt || 0)) {
          window._lastGlobalMsgAt = payload.sentAt;
          Swal.fire({
            title: "Pengumuman Penting",
            text: payload.text,
            icon: "warning",
            confirmButtonColor: "#4f46e5",
          });
          playBeep(440, 0.5, 2);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track presence dengan fingerprint
          await globalChannel.track({
            user_id: user.id,
            name: user.name,
            fingerprint: user.fingerprint || localStorage.getItem("cbt_device_fingerprint"),
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(personalChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [preview, user?.id]);

  // --- TIMER: tick only ---
  useEffect(() => {
    if (mode === "latihan") return;
    const timer = setInterval(
      () => setTimeLeft((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [mode]);

  // --- TIMER: watch for zero ---
  useEffect(() => {
    if (mode === "latihan") return;
    if (timeLeft === 0 && configLoaded && questions.length > 0) {
      handleFinishExamRef.current?.();
    }
  }, [timeLeft, configLoaded, questions.length, mode]);

  // --- TIMER: beep warnings ---
  useEffect(() => {
    if (mode === "latihan") return;
    if (timeLeft === 300) playBeep(880, 0.15, 2);
    if (timeLeft === 60) playBeep(660, 0.2, 3);
  }, [timeLeft, playBeep, mode]);

  // --- FULLSCREEN SYNC ---
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    onFs();
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // --- VISIBILITY WARNING & LOCK ---
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState !== "visible") {
        if (!preview && user?.id) {
          setTabSwitches(prev => {
            const newVal = prev + 1;
            supabase.from("sessions").update({
              tab_switches: newVal,
              last_active: new Date().toISOString(),
            }).eq("id", user.id).then(() => {}).catch(() => {});
            
            // Activate lock if switches >= 3
            if (newVal >= 3) {
              setLockTime(15); // Lock for 15 seconds
              playBeep(200, 0.5, 2);
            }
            return newVal;
          });
        }
        
        try {
          await Swal.fire({
            icon: "warning",
            title: "Jangan keluar dari halaman ujian",
            text: "Aktivitas Anda tercatat oleh sistem.",
            confirmButtonText: "Saya Mengerti",
            confirmButtonColor: "#4f46e5",
          });
        } catch {
          // ignore
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [preview, user?.id, playBeep]);

  // Lock timer tick
  useEffect(() => {
    if (lockTime <= 0) return;
    const itv = setInterval(() => setLockTime(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(itv);
  }, [lockTime]);

  // Update ruler position
  useEffect(() => {
    if (!showReadingRuler) return;
    const handleMove = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      setRulerY(y);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
    };
  }, [showReadingRuler]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      Swal.fire("Gagal", "Browser tidak mengizinkan fullscreen.", "error");
    }
  }

  // --- NAV HELPERS WITH DIRECTION ---
  const goToPrev = useCallback(() => {
    playSound("click");
    setSlideDir("left");
    setCurrentIndex((p) => Math.max(0, p - 1));
  }, []);

  const goToNext = useCallback(() => {
    playSound("click");
    setSlideDir("right");
    setCurrentIndex((p) => Math.min(questions.length - 1, p + 1));
  }, [questions.length]);

  const goToIndex = useCallback(
    (idx) => {
      playSound("click");
      setSlideDir(idx > currentIndex ? "right" : "left");
      setCurrentIndex(idx);
    },
    [currentIndex],
  );

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handler = (e) => {
      const q = questions[currentIndex];
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (isTyping) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (!q?.id) return;
        setDoubtful((d) => ({ ...d, [q.id]: !d[q.id] }));
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) || e.key === "End") {
        e.preventDefault();
        handleFinishExamRef.current?.();
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }

      const num = Number(e.key);
      if (!Number.isNaN(num) && num >= 1 && num <= 5 && q?.id) {
        const idx = num - 1;
        if (
          q.type === "PG" &&
          Array.isArray(q.options) &&
          idx < q.options.length
        ) {
          playSound("pop");
          setAnswers((a) => ({ ...a, [q.id]: idx }));
        }
        if (
          q.type === "BS" &&
          Array.isArray(q.statements) &&
          idx < q.statements.length
        ) {
          playSound("pop");
          setAnswers((a) => {
            const cur = a[q.id] || {};
            const nextVal = cur[idx] === true ? false : true;
            return { ...a, [q.id]: { ...cur, [idx]: nextVal } };
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions, currentIndex, goToNext, goToPrev]);

  // Swipe gesture removed per user request

  // --- CONFETTI BURST ---
  const fireConfetti = useCallback(() => {
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  // --- FINISH EXAM ---
  const handleFinishExam = async (silent = false) => {
    // Ensure silent is strictly true (avoid event object being truthy)
    const isSilent = silent === true;

    if (!isSilent) {
      const result = await Swal.fire({
        title: mode === "latihan" ? "Selesaikan Latihan?" : "Selesaikan Ujian?",
        html: `<div class="text-left">
          <p class="mb-3"><b>Status Jawaban:</b></p>
          <p>Sudah Dijawab: <b class="text-emerald-600">${Object.keys(answers).length}/${questions.length}</b></p>
          <p>Ragu-ragu: <b class="text-yellow-600">${Object.keys(doubtful).filter((k) => doubtful[k]).length}</b></p>
          <p class="mt-4 text-sm text-slate-600"><i>⚠️ Ujian tidak bisa dilanjutkan setelah klik Selesai</i></p>
        </div>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText:
          mode === "latihan" ? "Ya, Selesaikan" : "Ya, Selesaikan Ujian",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    }

    setIsFinished(true);

    try {
      if (resumeKey) localStorage.removeItem(resumeKey);

      // Panggil RPC submit_exam (Atomic Submission)
      const { data: rpcResult, error: rpcError } = await supabase.rpc("submit_exam", {
        p_student_id: user.id.toString(),
        p_mapel: mapel.toString(),
        p_mode: mode.toString(),
        p_answers: answers || {},
        p_doubtful: doubtful || {},
        p_timeLeft: parseInt(timeLeft || 0),
        p_durationLimit: parseInt(initialDurationSecRef.current || 0),
      });

      if (rpcError) throw rpcError;

      const { score, correct, total, earnedXp, newLevel, isLulus, id: examResultId } = rpcResult;
      
      const isLevelUp = newLevel > user.level;

      // Update local state user
      updateUser({ xp: user.xp + earnedXp, level: newLevel });
      if (score >= 100 || isLevelUp) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#a855f7", "#ec4899", "#fbbf24"],
        });
      } else if (isLulus) {
        playSound("success");
        fireConfetti();
      } else {
        playSound("notification");
      }

      if (isSilent) {
        if (preview && onExitPreview) {
          onExitPreview();
          return;
        }
        navigate("/");
        return;
      }

      Swal.fire({
        title:
          mode === "latihan"
            ? "Latihan Selesai! 🎉"
            : isLevelUp
            ? "LEVEL UP! 🆙✨"
            : isLulus
            ? "LULUS! 🎉"
            : "Belum Lulus 📚",
        html: `<div class="text-center py-2">
          <div class="text-4xl mb-3">${getStars(score)}</div>
          <p class="text-5xl font-black ${
            isLulus ? "text-emerald-600" : "text-orange-500"
          } mb-3">${score}</p>
          ${
            isLevelUp
              ? `<p class="mb-2 text-indigo-600 font-black animate-bounce">Selamat! Kamu naik ke Level ${newLevel}</p>`
              : ""
          }
          <p class="text-xs text-indigo-500 font-bold mb-3">+${earnedXp} XP Berhasil Didapat!</p>
          <p class="text-base mb-1">Jawaban Benar: <b>${correct}/${total}</b></p>
          <p class="mt-4 text-sm font-semibold text-slate-700">${getPesan(
            score,
            mapel
          )}</p>
          <p class="mt-3 text-xs text-slate-400">${
            examConfig.showResults
              ? "Halaman hasil akan dibuka..."
              : "Hasil disimpan. Silakan kembali ke dashboard."
          }</p>
        </div>`,
        icon: mode === "latihan" || isLulus || isLevelUp ? "success" : "warning",
        allowOutsideClick: false,
        didClose: () => {
          if (preview && onExitPreview) {
            onExitPreview();
            return;
          }
          if (examConfig.showResults) {
            navigate(`/result/${examResultId}`);
          } else {
            navigate("/");
          }
        },
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      Swal.fire(
        "Gagal",
        "Tidak bisa menyimpan hasil ujian: " + error.message,
        "error",
      );
    }
  };

  // --- KEEP REF ALWAYS CURRENT ---
  useEffect(() => {
    handleFinishExamRef.current = handleFinishExam;
  });

  const currentQ = questions[currentIndex];

  // ── Loading state ──
  if (!currentQ) {
    return (
      <Page className="flex flex-col select-none bg-slate-50">
        <div className="h-14 border-b border-slate-200 bg-white"></div>
        <Container className="flex-1 py-5 md:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:flex-row">
            <div className="flex-1 space-y-4">
              <div className="skeleton skeleton-card h-40"></div>
              <div className="grid gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-14 w-full rounded-xl"></div>
                ))}
              </div>
            </div>
            <div className="hidden md:block w-72 shrink-0 space-y-4">
              <div className="skeleton h-32 w-full rounded-2xl"></div>
              <div className="skeleton h-64 w-full rounded-2xl"></div>
            </div>
          </div>
        </Container>
      </Page>
    );
  }

  return (
    <div className={`relative min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900 ${isDyslexic ? "font-dyslexic" : ""}`}>
      {/* ── READING RULER ── */}
      {showReadingRuler && (
        <div 
          className="fixed left-0 right-0 z-[60] h-8 bg-indigo-500/10 border-y border-indigo-500/30 pointer-events-none transition-all duration-75 flex items-center justify-center"
          style={{ top: rulerY - 16 }}
        >
          <div className="w-full h-[1px] bg-indigo-500/40" />
          <div className="absolute right-4 rounded bg-indigo-500 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-tighter">
            Garis Bantu Baca
          </div>
        </div>
      )}

      {/* ── ANTI-CHEAT LOCK OVERLAY ── */}
      {lockTime > 0 && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-900/95 p-6 text-center backdrop-blur-md animate-fade-in">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/20 text-red-500 ring-4 ring-red-500/30">
            <i className="fas fa-lock text-4xl animate-bounce" />
          </div>
          <h2 className="text-3xl font-black text-white">Sistem Terkunci</h2>
          <p className="mt-3 max-w-sm text-lg text-slate-300">
            Anda terdeteksi berpindah halaman lebih dari 3 kali. Halaman dikunci demi keamanan.
          </p>
          <div className="mt-8 flex flex-col items-center">
            <div className="text-6xl font-black tabular-nums text-white">
              {lockTime}s
            </div>
            <div className="mt-2 text-sm font-bold uppercase tracking-widest text-slate-500">
              Tunggu hingga hitung mundur selesai
            </div>
          </div>
        </div>
      )}

      {/* ── Mascot "Si Pintar" ── */}
      {!isFinished && <Mascot message={mascotMsg} type={mascotType} />}

      <ExamTour 
        run={runTour} 
        onFinish={() => {
          localStorage.setItem("cbt_exam_tour_seen", "true");
          setRunTour(false);
        }} 
      />
      <Page className="select-none bg-slate-50">
      {/* Preview banner */}
      {preview && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-bold text-white">
          <div className="flex items-center gap-2">
            <i className="fas fa-eye" />
            MODE PREVIEW — Data tidak akan disimpan
          </div>
          <button
            type="button"
            onClick={onExitPreview}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold hover:bg-amber-700 transition"
          >
            <i className="fas fa-times" /> Keluar Preview
          </button>
        </div>
      )}

      {/* ── Sticky Header ── */}
      <ExamHeader
        themeGradient={themeGradient}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        fontSize={fontSize}
        setFontSize={setFontSize}
        isDrawingMode={isDrawingMode}
        setIsDrawingMode={setIsDrawingMode}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        mode={mode}
        timeLeft={timeLeft}
        initialDurationSec={initialDurationSecRef.current}
        onShowShortcuts={() => setShowShortcuts(true)}
        showReadingRuler={showReadingRuler}
        setShowReadingRuler={setShowReadingRuler}
        isDyslexic={isDyslexic}
        setIsDyslexic={setIsDyslexic}
      />

      {/* Mobile question progress bar */}
      <div className="md:hidden h-1 bg-slate-100">
        <div
          className="h-full bg-indigo-400 transition-all duration-300"
          style={{
            width: `${questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* ── Main Content ── */}
      <Container className="py-5 md:py-6">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 md:flex-row">
          {/* Canvas Scratchpad Overlay */}
          {isDrawingMode && <ScratchpadOverlay />}

          {/* Question Card with bottom navigation + swipe support */}
          <div
            className="tour-question flex-1"
            ref={questionAreaRef}
          >
            <div
              key={currentIndex}
              className={slideDir === "right" ? "animate-slide-right" : "animate-slide-left"}
            >
              <QuestionCard
                question={currentQ}
                fontSize={fontSize}
                doubtful={doubtful}
                answers={answers}
                setAnswers={setAnswers}
              />
            </div>

            {/* ── Bottom navigation ── */}
            <div className="tour-bottom-nav mt-4 mb-20 md:mb-0 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="btn btn-outline px-4 disabled:opacity-40"
              >
                <i className="fas fa-chevron-left text-xs" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              {/* Doubt toggle */}
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 transition ${
                  doubtful[currentQ.id]
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={!!doubtful[currentQ.id]}
                  onChange={() =>
                    setDoubtful({
                      ...doubtful,
                      [currentQ.id]: !doubtful[currentQ.id],
                    })
                  }
                />
                <i
                  className={`fas fa-flag text-xs ${
                    doubtful[currentQ.id]
                      ? "text-amber-500"
                      : "text-slate-300"
                  }`}
                />
                <span className="text-xs font-semibold">Ragu-ragu</span>
              </label>

              <button
                onClick={goToNext}
                disabled={currentIndex === questions.length - 1}
                className="btn btn-primary px-4 disabled:opacity-40"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <i className="fas fa-chevron-right text-xs" />
              </button>
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="tour-sidebar hidden xl:block">
            <ExamSidebar
              questions={questions}
              currentIndex={currentIndex}
              setCurrentIndex={goToIndex}
              answers={answers}
              doubtful={doubtful}
              onFinish={handleFinishExam}
            />
          </div>
        </div>
      </Container>

      {/* ── Mobile Bottom Sheet Navigation ── */}
      <ExamBottomSheet
        questions={questions}
        currentIndex={currentIndex}
        setCurrentIndex={goToIndex}
        answers={answers}
        doubtful={doubtful}
        onFinish={handleFinishExam}
      />

      {/* Keyboard Shortcut Cheatsheet */}
      <ShortcutModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Cloud Sync Indicator */}
      {!preview && (
        <div className={`fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-sm border transition-all duration-500 ${isSyncing ? "border-indigo-200 translate-y-0 opacity-100" : "border-transparent translate-y-4 opacity-0"}`}>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Sinkronisasi...</span>
        </div>
      )}
    </Page>
    </div>
  );
};

export default ExamRoom;
