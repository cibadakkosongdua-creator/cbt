export const DEFAULT_EXAM_CONFIG = {
  title: "Ujian",
  duration: 90,
  token: "",
  isActive: true,
  examType: "MAPEL",       // "MAPEL" | "TKA"
  activeMapel: "IPAS",     // Mata pelajaran aktif (untuk mode MAPEL)
  startAt: "",
  endAt: "",
  minScore: 70,
  passingGrade: "C",
  showResults: true,
  randomizeQuestions: true,
  partialScoringPGK: false,
};

/** Standard list of Mapel (mata pelajaran) available in the system */
export const MAPEL_LIST = [
  "IPAS",
  "Matematika",
  "Pendidikan Agama",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "PJOK",
  "Seni Budaya",
  "Bahasa Inggris",
  "Muatan Lokal",
];

/** Helper: determine subtes label for display */
export function getSubtesLabel(subtes) {
  if (subtes === "literasi") return "🔵 Literasi";
  if (subtes === "numerasi") return "🟠 Numerasi";
  return `📚 ${subtes}`;
}

/** Helper: determine if subtes belongs to TKA */
export function isTKA(subtes) {
  return subtes === "literasi" || subtes === "numerasi";
}

/** Helper: get badge color classes for a subtes */
export function getSubtesBadgeClass(subtes) {
  if (subtes === "literasi") return "bg-blue-50 text-blue-700 border-blue-200";
  if (subtes === "numerasi") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-purple-50 text-purple-700 border-purple-200";
}

export function getPassScore(config) {
  const n = Number(config?.minScore);
  if (Number.isNaN(n)) return DEFAULT_EXAM_CONFIG.minScore;
  return Math.max(0, Math.min(100, n));
}
