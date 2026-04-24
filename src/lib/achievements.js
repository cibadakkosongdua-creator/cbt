/**
 * Simple gamification logic for elementary students.
 * Pure functions — no state, no Firestore. Derived from exam history array.
 */

import { getPassScore } from "./examConfig";

/**
 * LEVEL SYSTEM CONFIG
 * XP needed for next level: (level * 100)
 */
export const calculateLevel = (totalXp) => {
  let level = 1;
  let xpNeeded = 100;
  let remainingXp = totalXp;

  while (remainingXp >= xpNeeded) {
    remainingXp -= xpNeeded;
    level++;
    xpNeeded = level * 100;
  }

  return { level, remainingXp, xpNeeded, progress: (remainingXp / xpNeeded) * 100 };
};

export const XP_REWARDS = {
  SUBMIT_EXAM: 50,
  PERFECT_SCORE: 100,
  KILAT_KUNING: 75,
  PASS_KKM: 25,
};

/**
 * All possible badges. Each has an `unlocked(history, cfg)` predicate.
 * Note: History is filtered to only include 'tryout' mode results for achievements.
 * Order matters for display (earliest / easiest first).
 */
export const BADGES = [
  {
    id: "first_exam",
    icon: "fa-flag",
    color: "from-sky-400 to-blue-500",
    title: "Langkah Pertama",
    desc: "Menyelesaikan ujian pertamamu.",
    check: (h) => h.filter(r => r.mode === 'tryout').length >= 1,
  },
  {
    id: "five_exams",
    icon: "fa-fire",
    color: "from-orange-400 to-red-500",
    title: "Rajin Belajar",
    desc: "Menyelesaikan 5 ujian.",
    check: (h) => h.filter(r => r.mode === 'tryout').length >= 5,
  },
  {
    id: "ten_exams",
    icon: "fa-bolt",
    color: "from-amber-400 to-yellow-500",
    title: "Jagoan Ujian",
    desc: "Menyelesaikan 10 ujian.",
    check: (h) => h.filter(r => r.mode === 'tryout').length >= 10,
  },
  {
    id: "high_score",
    icon: "fa-star",
    color: "from-violet-400 to-purple-500",
    title: "Nilai Tinggi",
    desc: "Mendapat nilai ≥ 90.",
    check: (h) => h.filter(r => r.mode === 'tryout').some((r) => (r.score ?? 0) >= 90),
  },
  {
    id: "perfect_score",
    icon: "fa-crown",
    color: "from-yellow-400 to-amber-600",
    title: "Sempurna",
    desc: "Mendapat nilai 100.",
    check: (h) => h.filter(r => r.mode === 'tryout').some((r) => (r.score ?? 0) >= 100),
  },
  {
    id: "three_in_a_row",
    icon: "fa-medal",
    color: "from-emerald-400 to-teal-500",
    title: "Konsisten",
    desc: "3 kali berturut lulus KKM.",
    check: (h, cfg) => {
      const history = h.filter(r => r.mode === 'tryout');
      if (history.length < 3) return false;
      // history is sorted desc by submittedAt; take 3 most recent
      const recent = history.slice(0, 3);
      return recent.every(
        (r) => (r.score ?? 0) >= (r.passScore ?? getPassScore(cfg)),
      );
    },
  },
  {
    id: "twenty_exams",
    icon: "fa-trophy",
    color: "from-rose-400 to-pink-500",
    title: "Veteran",
    desc: "Menyelesaikan 20 ujian.",
    check: (h) => h.filter(r => r.mode === 'tryout').length >= 20,
  },
  {
    id: "kilat_kuning",
    icon: "fa-bolt-lightning",
    color: "from-yellow-300 via-amber-400 to-yellow-500",
    title: "Kilat Kuning",
    desc: "Selesai < 50% waktu & Nilai ≥ 90.",
    check: (h, cfg) => {
      return h.filter(r => r.mode === 'tryout').some((r) => {
        const totalTime = Number(r.duration_limit || cfg.duration || 60);
        const timeSpent = Number(r.duration || 0);
        const score = Number(r.score || 0);
        return score >= 90 && timeSpent > 0 && timeSpent <= totalTime / 2;
      });
    },
  },
  {
    id: "subject_master",
    icon: "fa-book-bookmark",
    color: "from-blue-500 via-indigo-600 to-purple-700",
    title: "Penguasa Mapel",
    desc: "Dapat nilai 100 di 3 mata pelajaran berbeda.",
    check: (h) => {
      const perfectSubtes = new Set(
        h.filter(r => r.mode === 'tryout').filter((r) => (r.score ?? 0) >= 100).map((r) => r.subtes)
      );
      return perfectSubtes.size >= 3;
    },
  },
  {
    id: "fifty_exams",
    icon: "fa-dragon",
    color: "from-slate-700 via-slate-800 to-black",
    title: "Legenda Sekolah",
    desc: "Menyelesaikan 50 ujian.",
    check: (h) => h.filter(r => r.mode === 'tryout').length >= 50,
  },
  {
    id: "invincible_streak",
    icon: "fa-shield-heart",
    color: "from-rose-500 via-red-600 to-orange-700",
    title: "Tak Terkalahkan",
    desc: "10 kali berturut-turut lulus KKM.",
    check: (h, cfg) => {
      const history = h.filter(r => r.mode === 'tryout');
      if (history.length < 10) return false;
      const recent = history.slice(0, 10);
      return recent.every(
        (r) => (r.score ?? 0) >= (r.passScore ?? getPassScore(cfg))
      );
    },
  },
];

/**
 * REWARDS Mapping
 * Maps Achievement ID to Item IDs it unlocks.
 */
export const REWARDS = {
  first_exam: ["border_blue"],
  five_exams: ["avatar_5", "avatar_6", "avatar_7", "avatar_8"],
  ten_exams: ["avatar_9", "avatar_10", "avatar_11", "avatar_12"],
  twenty_exams: ["avatar_13", "avatar_14", "avatar_15", "avatar_16"],
  perfect_score: ["border_gold"],
  kilat_kuning: ["avatar_special_1", "border_electric"],
  subject_master: ["avatar_special_2", "border_rainbow"],
  fifty_exams: ["avatar_special_3", "border_dark_knight"],
  invincible_streak: ["border_heartbeat"],
};

/**
 * ALL ITEMS Definition
 * For UI rendering and checking.
 */
export const ALL_ITEMS = {
  avatars: [
    { id: "avatar_1", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Lucky", title: "Lucky" },
    { id: "avatar_2", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Snuggles", title: "Snuggles" },
    { id: "avatar_3", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cookie", title: "Cookie" },
    { id: "avatar_4", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Zoe", title: "Zoe" },
    { id: "avatar_5", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Daisy", title: "Daisy", requirementId: "five_exams" },
    { id: "avatar_6", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Panda", title: "Panda", requirementId: "five_exams" },
    { id: "avatar_7", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Buster", title: "Buster", requirementId: "five_exams" },
    { id: "avatar_8", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Mittens", title: "Mittens", requirementId: "five_exams" },
    { id: "avatar_9", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Sassy", title: "Sassy", requirementId: "ten_exams" },
    { id: "avatar_10", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Peanut", title: "Peanut", requirementId: "ten_exams" },
    { id: "avatar_11", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bear", title: "Bear", requirementId: "ten_exams" },
    { id: "avatar_12", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Tiger", title: "Tiger", requirementId: "ten_exams" },
    { id: "avatar_13", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Frog", title: "Frog", requirementId: "twenty_exams" },
    { id: "avatar_14", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rabbit", title: "Rabbit", requirementId: "twenty_exams" },
    { id: "avatar_15", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Fox", title: "Fox", requirementId: "twenty_exams" },
    { id: "avatar_16", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Koala", title: "Koala", requirementId: "twenty_exams" },
    { id: "avatar_special_1", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=YellowFlash", title: "Yellow Flash", requirementId: "kilat_kuning", rarity: "legendary" },
    { id: "avatar_special_2", url: "https://api.dicebear.com/7.x/big-smile/svg?seed=Master", title: "Mapel Master", requirementId: "subject_master", rarity: "legendary" },
    { id: "avatar_special_3", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Legend", title: "Legenda", requirementId: "fifty_exams", rarity: "mythic" },
  ],
  borders: [
    { id: "none", title: "Tanpa Border", class: "" },
    { id: "border_blue", title: "Biru Pemula", class: "ring-4 ring-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]", requirementId: "first_exam" },
    { id: "border_gold", title: "Emas Sempurna", class: "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]", requirementId: "perfect_score" },
    { id: "border_electric", title: "Kilat Elektrik", class: "ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-pulse", requirementId: "kilat_kuning", rarity: "legendary" },
    { id: "border_rainbow", title: "Pelangi Cerdas", class: "ring-4 ring-transparent shadow-[0_0_20px_rgba(168,85,247,0.5)] bg-gradient-to-r from-red-500 via-green-500 to-blue-500 bg-[length:200%_200%] animate-gradient", requirementId: "subject_master", rarity: "legendary" },
    { id: "border_dark_knight", title: "Ksatria Kegelapan", class: "ring-4 ring-slate-800 shadow-[0_0_30px_rgba(30,41,59,0.9)] grayscale hover:grayscale-0 transition-all", requirementId: "fifty_exams", rarity: "mythic" },
    { id: "border_heartbeat", title: "Jantung Juara", class: "ring-4 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-bounce-subtle", requirementId: "invincible_streak", rarity: "legendary" },
  ]
};

/**
 * Returns an array of badges with { ...badge, earned: boolean }.
 */
export function computeBadges(history = [], examConfig = {}) {
  return BADGES.map((b) => ({
    ...b,
    earned: Boolean(b.check(history, examConfig)),
  }));
}

/**
 * Compute student-level stats for profile cards.
 * Note: Only includes 'tryout' mode results for statistics.
 */
export function computeStudentStats(history = [], examConfig = {}) {
  // Only count 'tryout' mode results for stats
  const tryoutHistory = (history || []).filter(r => r.mode === 'tryout');
  const totalExams = tryoutHistory.length;
  
  if (totalExams === 0) {
    return {
      totalExams: 0,
      avgScore: 0,
      bestScore: 0,
      passedCount: 0,
      passRate: 0,
    };
  }

  const scores = tryoutHistory.map((r) => Number(r.score) || 0);
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const avgScore = Math.round(totalScore / totalExams);
  const bestScore = Math.max(...scores);
  
  const minPassScore = Number(examConfig?.minScore) || 70;
  const passedCount = tryoutHistory.filter(
    (r) => (Number(r.score) || 0) >= (Number(r.passScore) || Number(r.pass_score) || minPassScore),
  ).length;
  
  const passRate = Math.round((passedCount / totalExams) * 100);
  
  return { totalExams, avgScore, bestScore, passedCount, passRate };
}

/**
 * Daily tip — rotating based on day-of-year so every day feels fresh,
 * but deterministic (not "random per render").
 */
export const DAILY_TIPS = [
  {
    icon: "fa-lightbulb",
    title: "Tenangkan pikiranmu",
    body: "Tarik napas dalam 3 kali sebelum mulai. Pikiran tenang = jawaban lebih tepat.",
  },
  {
    icon: "fa-book-open-reader",
    title: "Baca soal dengan teliti",
    body: "Pahami dulu apa yang ditanyakan sebelum melihat pilihan jawaban.",
  },
  {
    icon: "fa-hourglass-half",
    title: "Kelola waktu dengan baik",
    body: "Kalau ada soal sulit, lewati dulu. Kembalilah setelah selesai yang mudah.",
  },
  {
    icon: "fa-clipboard-check",
    title: "Cek ulang jawabanmu",
    body: "Sisakan waktu 5 menit di akhir untuk memeriksa kembali jawaban yang ragu-ragu.",
  },
  {
    icon: "fa-mug-hot",
    title: "Sarapan dulu",
    body: "Otak butuh energi. Jangan ujian dengan perut kosong supaya fokus maksimal.",
  },
  {
    icon: "fa-hand-sparkles",
    title: "Percaya pada dirimu",
    body: "Kamu sudah belajar keras. Yakinlah bahwa kamu bisa melakukannya.",
  },
  {
    icon: "fa-brain",
    title: "Istirahat sebentar",
    body: "Kalau pusing, pejamkan mata 10 detik. Otak akan segar kembali.",
  },
];

export function getDailyTip(date = new Date()) {
  // Day-of-year so it rotates daily but stays stable within a day.
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}
