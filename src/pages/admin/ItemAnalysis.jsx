import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import EmptyState from "../../ui/EmptyState";
import PageHeader from "../../components/admin/PageHeader";
import { getSubtesLabel, getSubtesBadgeClass, isTKA, MAPEL_LIST } from "../../lib/examConfig";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const ItemAnalysis = () => {
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubtes, setFilterSubtes] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterJenis, setFilterJenis] = useState("TKA");
  const [expandedId, setExpandedId] = useState(null);

  const fetchData = async () => {
    const [qRes, rRes] = await Promise.all([
      supabase.from("questions").select("*"),
      supabase.from("results").select("*"),
    ]);
    if (qRes.data) setQuestions(qRes.data);
    if (rRes.data) setResults(rRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("item-analysis-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Compute analysis per question
  const analysis = useMemo(() => {
    return questions.map((q) => {
      let totalAnswered = 0;
      let correctCount = 0;
      const optionDistribution = {};

      // Initialize option distribution for PG
      if (q.type === "PG" && Array.isArray(q.options)) {
        q.options.forEach((_, idx) => { optionDistribution[idx] = 0; });
      }

      results.forEach((r) => {
        // Check if this question was in this exam
        if (r.questionIds && !r.questionIds.includes(q.id)) return;
        const userAns = r.answers?.[q.id];
        if (userAns === undefined && userAns !== 0) return;

        totalAnswered++;

        // Track correct
        let isCorrect = false;
        if (q.type === "PG") {
          isCorrect = userAns === q.answer;
          if (typeof userAns === "number") {
            optionDistribution[userAns] = (optionDistribution[userAns] || 0) + 1;
          }
        } else if (q.type === "PGK") {
          const ua = Array.isArray(userAns) ? userAns : [];
          const ca = Array.isArray(q.answer) ? q.answer : [];
          isCorrect = JSON.stringify(ua.sort()) === JSON.stringify([...ca].sort());
        } else if (q.type === "ISIAN") {
          isCorrect = userAns?.toLowerCase?.().trim() === q.answer?.toLowerCase?.().trim();
        } else if (q.type === "BS") {
          isCorrect = q.statements?.every((stmt, idx) => userAns?.[idx] === stmt.isTrue);
        } else if (q.type === "JODOH") {
          isCorrect = q.pairs?.every((_, idx) => userAns?.[idx] === idx);
        }

        if (isCorrect) correctCount++;
      });

      const difficultyIndex = totalAnswered > 0
        ? Math.round((correctCount / totalAnswered) * 100)
        : null;

      // Actual difficulty based on data
      let actualDifficulty = "–";
      if (difficultyIndex !== null) {
        if (difficultyIndex >= 70) actualDifficulty = "easy";
        else if (difficultyIndex >= 40) actualDifficulty = "medium";
        else actualDifficulty = "hard";
      }

      return {
        ...q,
        totalAnswered,
        correctCount,
        difficultyIndex,
        actualDifficulty,
        optionDistribution,
      };
    });
  }, [questions, results]);

  // Apply filters
  const filtered = useMemo(() => {
    let data = analysis;
    if (filterSubtes !== "all") {
      data = data.filter((q) => (q.subtes || "literasi") === filterSubtes);
    } else {
      if (filterJenis === "TKA") {
        data = data.filter((q) => (q.subtes || "literasi") === "literasi" || q.subtes === "numerasi");
      } else {
        data = data.filter((q) => q.subtes && q.subtes !== "literasi" && q.subtes !== "numerasi");
      }
    }
    if (filterDifficulty !== "all")
      data = data.filter((q) => (q.difficulty || "medium") === filterDifficulty);
    return data.sort((a, b) => (a.difficultyIndex ?? 999) - (b.difficultyIndex ?? 999));
  }, [analysis, filterSubtes, filterDifficulty, filterJenis]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const withData = analysis.filter((q) => q.difficultyIndex !== null);
    const avgDifficulty = withData.length
      ? Math.round(withData.reduce((s, q) => s + q.difficultyIndex, 0) / withData.length)
      : 0;
    const easy = withData.filter((q) => q.actualDifficulty === "easy").length;
    const medium = withData.filter((q) => q.actualDifficulty === "medium").length;
    const hard = withData.filter((q) => q.actualDifficulty === "hard").length;
    return { total: questions.length, answered: withData.length, avgDifficulty, easy, medium, hard };
  }, [analysis, questions.length]);

  const getDifficultyColor = (d) => {
    if (d === "easy") return "bg-green-50 text-green-700 border-green-200";
    if (d === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
    if (d === "hard") return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-500 border-slate-200";
  };

  const getDifficultyLabel = (d) => {
    if (d === "easy") return "Mudah";
    if (d === "medium") return "Sedang";
    if (d === "hard") return "Sulit";
    return "–";
  };

  const getDifficultyBarColor = (idx) => {
    if (idx >= 70) return "#10b981";
    if (idx >= 40) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="fa-microscope"
        iconTone="violet"
        title="Analisis Butir Soal"
        subtitle="Statistik tingkat kesulitan dan distribusi pola jawaban peserta per soal"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Total Soal", value: summaryStats.total, icon: "fa-book", color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Punya Data", value: summaryStats.answered, icon: "fa-chart-simple", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Rata-rata P", value: `${summaryStats.avgDifficulty}%`, icon: "fa-percent", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Mudah", value: summaryStats.easy, icon: "fa-face-smile", color: "text-green-600", bg: "bg-green-50" },
          { label: "Sedang", value: summaryStats.medium, icon: "fa-face-meh", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Sulit", value: summaryStats.hard, icon: "fa-face-frown", color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${s.bg} blur-xl opacity-60`}></div>
            <div className="relative flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${s.bg} shadow-sm`}>
                <i className={`fas ${s.icon} text-lg ${s.color}`} />
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</div>
                <div className="text-2xl font-black text-slate-800">{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Difficulty Distribution Chart */}
      {summaryStats.answered > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            Distribusi Tingkat Kesulitan Aktual
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Mudah (≥70%)", value: summaryStats.easy, fill: "#10b981" },
                  { name: "Sedang (40-69%)", value: summaryStats.medium, fill: "#f59e0b" },
                  { name: "Sulit (<40%)", value: summaryStats.hard, fill: "#ef4444" },
                ]}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgb(0 0 0/0.1)", fontSize: "12px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {[0, 1, 2].map((i) => (
                    <Cell key={i} fill={["#10b981", "#f59e0b", "#ef4444"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* ── Level 1: Jenis ── */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Jenis:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
            {[
              { id: "TKA", label: "TKA", icon: "fa-brain" },
              { id: "MAPEL", label: "Mapel", icon: "fa-graduation-cap" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setFilterJenis(t.id); setFilterSubtes("all"); }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  filterJenis === t.id
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <i className={`fas ${t.icon} text-[10px]`} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Level 2: Sub-filter ── */}
          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            onClick={() => setFilterSubtes("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filterSubtes === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >Semua</button>

          {filterJenis === "TKA" ? (
            ["literasi", "numerasi"].map(s => (
              <button
                key={s}
                onClick={() => setFilterSubtes(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filterSubtes === s
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                }`}
              >{getSubtesLabel(s)}</button>
            ))
          ) : (
            <select
              value={filterSubtes === "all" ? "all" : filterSubtes}
              onChange={(e) => setFilterSubtes(e.target.value)}
              className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 outline-none transition hover:bg-purple-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
            >
              <option value="all">Pilih Mapel (Semua)</option>
              {MAPEL_LIST.map(m => (
                <option key={m} value={m}>{getSubtesLabel(m)}</option>
              ))}
            </select>
          )}

          {/* ── Level ── */}
          <div className="h-4 w-px bg-slate-300 mx-1" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Level:</span>

          {[
            { id: "all", label: "Semua", color: "bg-slate-100 text-slate-600 hover:bg-slate-200", active: "bg-indigo-600 text-white shadow-sm" },
            { id: "easy", label: "🟢 Mudah", color: "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200", active: "bg-green-600 text-white shadow-sm" },
            { id: "medium", label: "🟡 Sedang", color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200", active: "bg-amber-500 text-white shadow-sm" },
            { id: "hard", label: "🔴 Sulit", color: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200", active: "bg-red-600 text-white shadow-sm" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilterDifficulty(chip.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filterDifficulty === chip.id ? chip.active : chip.color
              }`}
            >
              {chip.label}
            </button>
          ))}

          <div className="ml-auto inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {filtered.length} / {questions.length} soal
          </div>
        </div>
      </div>

      {/* Question cards */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6 bg-slate-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-4 w-20 rounded-full bg-slate-100" />
                      <div className="h-4 w-16 rounded-full bg-slate-100" />
                    </div>
                    <div className="h-4 w-full rounded bg-slate-100" />
                  </div>
                  <div className="h-6 w-6 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <table className="w-full">
            <tbody>
              <EmptyState
                icon="fa-chart-column"
                title="Tidak Ada Data"
                description="Belum ada soal atau belum ada yang mengerjakan ujian."
                colSpan={1}
              />
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((q) => {
              const isExpanded = expandedId === q.id;
              return (
                <div key={q.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="flex w-full items-start gap-4 px-6 py-4 text-left transition hover:bg-slate-50 cursor-pointer"
                  >
                    {/* Difficulty gauge */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${
                          q.difficultyIndex !== null
                            ? q.difficultyIndex >= 70
                              ? "bg-green-100 text-green-700"
                              : q.difficultyIndex >= 40
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {q.difficultyIndex !== null ? `${q.difficultyIndex}%` : "–"}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase">
                        P-Index
                      </span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getSubtesBadgeClass(q.subtes || "literasi")}`}>
                          {getSubtesLabel(q.subtes || "literasi")}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getDifficultyColor(q.difficulty || "medium")}`}>
                          Tag: {getDifficultyLabel(q.difficulty || "medium")}
                        </span>
                        {q.actualDifficulty !== "–" && q.actualDifficulty !== (q.difficulty || "medium") && (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getDifficultyColor(q.actualDifficulty)}`}>
                            Aktual: {getDifficultyLabel(q.actualDifficulty)}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {q.type}
                        </span>
                      </div>
                      <div 
                        className="text-sm font-semibold text-slate-800 line-clamp-2 html-content"
                        dangerouslySetInnerHTML={{ __html: typeof q.question === 'object' ? (q.question?.text || "") : String(q.question || "") }}
                      />

                      <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                        <span><i className="fas fa-users mr-1" />{q.totalAnswered} dijawab</span>
                        <span><i className="fas fa-check mr-1" />{q.correctCount} benar</span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <i className={`fas fa-chevron-down text-slate-300 text-xs transition-transform mt-2 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 space-y-4 cursor-default">
                      {/* Image in Expanded View */}
                      {q.image && typeof q.image === 'string' && q.image.trim() !== '' && (
                        <div className="mb-4 flex justify-center">
                          <img
                            src={q.image}
                            alt="Gambar soal"
                            className="max-h-64 w-auto rounded-xl border border-slate-200 object-contain shadow-sm bg-white"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      {/* Stimulus */}
                      {q.stimulus && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Bacaan / Stimulus
                          </p>
                          <div 
                            className="html-content text-sm leading-relaxed text-slate-600 italic"
                            dangerouslySetInnerHTML={{ __html: typeof q.stimulus === 'object' ? (q.stimulus?.text || "") : String(q.stimulus || "") }}
                          />
                        </div>
                      )}

                      {/* Progress bar */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500">Tingkat Kesulitan (P-Index)</span>
                          <span style={{ color: getDifficultyBarColor(q.difficultyIndex || 0) }}>
                            {q.difficultyIndex !== null ? `${q.difficultyIndex}%` : "Belum ada data"}
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${q.difficultyIndex ?? 0}%`,
                              backgroundColor: getDifficultyBarColor(q.difficultyIndex || 0),
                            }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                          <span>0% (Sangat Sulit)</span>
                          <span>100% (Sangat Mudah)</span>
                        </div>
                      </div>

                      {/* PG Option distribution */}
                      {q.type === "PG" && Array.isArray(q.options) && q.totalAnswered > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                            Distribusi Jawaban
                          </div>
                          <div className="space-y-2">
                            {q.options.map((opt, idx) => {
                              const count = q.optionDistribution[idx] || 0;
                              const pct = q.totalAnswered > 0 ? Math.round((count / q.totalAnswered) * 100) : 0;
                              const isCorrect = idx === q.answer;
                              return (
                                <div key={idx} className="flex items-center gap-3">
                                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    isCorrect ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <div 
                                        className="text-xs text-slate-600 truncate html-content flex-1"
                                        dangerouslySetInnerHTML={{ __html: typeof opt === 'object' && opt !== null ? (opt.text || opt.label || "") : String(opt || "") }}
                                      />
                                      <span className="text-xs font-semibold text-slate-500 ml-2 shrink-0">
                                        {count} ({pct}%)
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${isCorrect ? "bg-green-500" : "bg-slate-300"}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dijawab</div>
                          <div className="text-lg font-bold text-slate-900">{q.totalAnswered}</div>
                        </div>
                        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-green-500">Benar</div>
                          <div className="text-lg font-bold text-green-700">{q.correctCount}</div>
                        </div>
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Salah</div>
                          <div className="text-lg font-bold text-red-700">{q.totalAnswered - q.correctCount}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemAnalysis;
