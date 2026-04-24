import React, { useMemo } from "react";

/**
 * Horizontal bar-chart style widget showing average score per class.
 * Works client-side from allResults; no extra Firestore reads.
 */
const ClassPerformance = ({ results = [], passScore = 70, loading = false }) => {
  const classData = useMemo(() => {
    if (!results.length) return [];
    const byClass = {};
    results.forEach((r) => {
      if (r.mode === "latihan") return;
      const k = r.kelas || "–";
      if (!byClass[k]) byClass[k] = { kelas: k, scores: [], passed: 0, total: 0 };
      byClass[k].scores.push(r.score || 0);
      byClass[k].total += 1;
      if ((r.score || 0) >= passScore) byClass[k].passed += 1;
    });
    return Object.values(byClass)
      .map((c) => ({
        ...c,
        avg: Math.round(c.scores.reduce((s, v) => s + v, 0) / c.scores.length),
        passRate: Math.round((c.passed / c.total) * 100),
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [results, passScore]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!classData.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <i className="fas fa-school text-3xl text-slate-200" />
        <div className="text-xs font-semibold text-slate-400">
          Belum ada data kelas
        </div>
      </div>
    );
  }

  const maxAvg = Math.max(...classData.map((c) => c.avg), 100);

  return (
    <div className="space-y-3">
      {classData.slice(0, 8).map((c) => {
        const width = Math.max(8, (c.avg / maxAvg) * 100);
        const barColor =
          c.avg >= 80 ? "from-emerald-400 to-teal-500" :
          c.avg >= passScore ? "from-indigo-400 to-violet-500" :
          "from-amber-400 to-orange-500";
        return (
          <div key={c.kelas} className="group">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-10 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black text-slate-700">
                  {c.kelas}
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {c.total} siswa · {c.passRate}% lulus
                </span>
              </div>
              <span className="text-xs font-black tabular-nums text-slate-900">
                {c.avg}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClassPerformance;
