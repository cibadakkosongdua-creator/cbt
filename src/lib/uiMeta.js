export const QUESTION_TYPE_META = {
  PG: {
    label: 'Pilihan Ganda',
    shortLabel: 'PG',
    badgeClass: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
  PGK: {
    label: 'Pilihan Ganda Kompleks',
    shortLabel: 'PGK',
    badgeClass: 'bg-purple-50 text-purple-700 ring-purple-200',
  },
  ISIAN: {
    label: 'Isian',
    shortLabel: 'ISIAN',
    badgeClass: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  },
  JODOH: {
    label: 'Menjodohkan',
    shortLabel: 'JODOH',
    badgeClass: 'bg-pink-50 text-pink-700 ring-pink-200',
  },
  BS: {
    label: 'Benar/Salah',
    shortLabel: 'BS',
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
};

export function getQuestionTypeMeta(type) {
  return (
    QUESTION_TYPE_META[type] || {
      label: 'Unknown',
      shortLabel: type || 'UNKNOWN',
      badgeClass: 'bg-slate-50 text-slate-700 ring-slate-200',
    }
  );
}

