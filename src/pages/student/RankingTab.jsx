import React from "react";
import { getAvatarGrad } from "../../lib/avatarUtils";
import { ALL_ITEMS } from "../../lib/achievements";
import { MAPEL_LIST } from "../../lib/examConfig";
import EmptyState from "../../ui/EmptyState";

const MEDAL = ["fa-crown", "fa-medal", "fa-medal"];
const PODIUM_STYLES = [
  // 1st
  {
    bar: "h-20 bg-gradient-to-b from-amber-400 to-yellow-500",
    ring: "ring-4 ring-amber-300",
    scoreColor: "text-amber-600",
    iconColor: "text-amber-500",
  },
  // 2nd
  {
    bar: "h-14 bg-gradient-to-b from-slate-300 to-slate-400",
    ring: "ring-4 ring-slate-200",
    scoreColor: "text-slate-600",
    iconColor: "text-slate-400",
  },
  // 3rd
  {
    bar: "h-10 bg-gradient-to-b from-orange-400 to-amber-600",
    ring: "ring-4 ring-orange-200",
    scoreColor: "text-orange-600",
    iconColor: "text-orange-400",
  },
];

/* ── Podium column (used inside top-3 display) ─────────── */
const PodiumColumn = ({ rank, student, styles }) => {
  if (!student) return null;
  const borderClass = ALL_ITEMS.borders.find(b => b.id === (student.activeBorder || "none"))?.class || styles.ring;

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      {/* Crown / medal above avatar (#1 only gets crown) */}
      <i
        className={`fas ${MEDAL[rank]} text-xl ${styles.iconColor} ${
          rank === 0 ? "drop-shadow-md" : ""
        }`}
      />
      {/* Avatar */}
      <div
        className={`flex ${
          rank === 0 ? "h-16 w-16" : "h-12 w-12"
        } items-center justify-center overflow-hidden rounded-2xl bg-white ${borderClass} shadow-lg transition-transform hover:scale-105`}
      >
        {student.photoURL ? (
          <img src={student.photoURL} alt={student.studentName} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGrad(student.studentName)} text-white font-black ${rank === 0 ? "text-2xl" : "text-lg"}`}>
            {student.studentName?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      {/* Name */}
      <div className="w-full max-w-[96px] text-center">
        <div className="text-[11px] font-bold text-slate-900 truncate">
          {student.studentName}
        </div>
        <div className="text-[10px] text-slate-400 truncate leading-tight">
          Kelas {student.kelas || "–"} <br/>
          <span className="text-[9px] font-medium text-indigo-500 uppercase tracking-tighter">{student.subtes || "Umum"}</span>
        </div>
      </div>
      {/* Podium bar with rank number */}
      <div
        className={`flex w-full items-start justify-center rounded-t-xl pt-2 text-sm font-black text-white/90 shadow-md ${styles.bar}`}
      >
        #{rank + 1}
      </div>
      {/* Score chip */}
      <div
        className={`-mt-2.5 rounded-full bg-white px-2.5 py-0.5 text-sm font-black ring-1 ring-slate-200 shadow-sm ${styles.scoreColor}`}
      >
        {student.score}
      </div>
    </div>
  );
};

const RankingTab = ({ 
  leaderboard = [], 
  lbLoading, 
  fetchLeaderboard, 
  userId,
  rankingFilter,
  setRankingFilter
}) => {
  const myPosition = leaderboard ? leaderboard.findIndex((r) => r.studentId === userId) : -1;

  const currentSubtesList = rankingFilter.type === "TKA" 
    ? ["SEMUA", "literasi", "numerasi"] 
    : ["SEMUA", ...MAPEL_LIST];

  return (
    <div className="space-y-5">
      {/* Header & Main Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Peringkat Juara</h2>
            <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Lihat siapa yang paling jago di sekolah!
            </p>
          </div>
          <button
            onClick={() => fetchLeaderboard()}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          >
            <i className={`fas fa-rotate-right text-xs ${lbLoading ? 'fa-spin' : ''}`} />
          </button>
        </div>

        {/* Category Switcher */}
        <div className="flex p-1 gap-1 rounded-2xl bg-slate-100 ring-1 ring-slate-200/50">
          <button
            onClick={() => setRankingFilter({ type: "MAPEL", subtes: "SEMUA" })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              rankingFilter.type === "MAPEL" ? "bg-white text-indigo-700 shadow-md" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <i className="fas fa-book-open text-[10px]" />
            Mata Pelajaran
          </button>
          <button
            onClick={() => setRankingFilter({ type: "TKA", subtes: "SEMUA" })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              rankingFilter.type === "TKA" ? "bg-white text-orange-700 shadow-md" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <i className="fas fa-brain text-[10px]" />
            Latihan Nasional
          </button>
        </div>

        {/* Subtes Filters (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
          {currentSubtesList.map((st) => (
            <button
              key={st}
              onClick={() => setRankingFilter({ ...rankingFilter, subtes: st })}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${
                rankingFilter.subtes === st
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
              }`}
            >
              {st === "SEMUA" ? "Semua" : (st === "literasi" ? "Literasi" : (st === "numerasi" ? "Numerasi" : st))}
            </button>
          ))}
        </div>
      </div>

      {lbLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghitung Peringkat...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <EmptyState 
          icon="fa-chart-column"
          title="Belum Ada Peringkat"
          description={`Belum ada data untuk kategori ${rankingFilter.subtes === 'SEMUA' ? rankingFilter.type : rankingFilter.subtes}. Ayo kerjakan ujian dan jadilah yang pertama!`}
          isTable={false}
        />
      ) : (
        <>
          {/* ══════ TOP 3 PODIUM ══════ */}
          <div className="flex items-end justify-center gap-2 pt-8 pb-4">
            {/* Rank 2 */}
            <PodiumColumn
              rank={1}
              student={leaderboard[1]}
              styles={PODIUM_STYLES[1]}
            />
            {/* Rank 1 */}
            <PodiumColumn
              rank={0}
              student={leaderboard[0]}
              styles={PODIUM_STYLES[0]}
            />
            {/* Rank 3 */}
            <PodiumColumn
              rank={2}
              student={leaderboard[2]}
              styles={PODIUM_STYLES[2]}
            />
          </div>

          {/* ══════ RANKING LIST (4-10) ══════ */}
          <div className="space-y-2">
            {leaderboard.map((r, idx) => {
              if (idx < 3) return null; // handled by podium
              const isMe = r.studentId === userId;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition-all ${
                    isMe
                      ? "border-indigo-100 bg-indigo-50/50 shadow-sm"
                      : "border-slate-50 bg-white"
                  }`}
                >
                  <div className="w-9 shrink-0 text-center">
                    <span className="text-sm font-black text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Avatar with border */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ${ALL_ITEMS.borders.find(b => b.id === (r.activeBorder || "none"))?.class || "ring-1 ring-slate-100"}`}>
                    {r.photoURL ? (
                      <img src={r.photoURL} alt={r.studentName} className="h-full w-full object-cover" />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-sm font-black text-white ${getAvatarGrad(r.studentName)}`}>
                        {r.studentName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-bold truncate ${isMe ? "text-indigo-900" : "text-slate-900"}`}>
                        {r.studentName}
                      </div>
                      {isMe && (
                        <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                          Kamu
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      Kelas {r.kelas || "–"} • {r.subtes || "Umum"}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-lg font-black ${isMe ? "text-indigo-600" : "text-slate-700"}`}>
                      {r.score}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">
                      Poin
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* User's position if not in top 10 */}
          {myPosition === -1 && userId && (
            <div className="mt-8 rounded-3xl bg-slate-900 p-5 text-white shadow-xl shadow-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-white">
                    ?
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-tight">Peringkat Kamu</div>
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                      Di luar 10 besar
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white/40 uppercase">Ayo Semangat!</div>
                  <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Kejar Juara 🏆</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RankingTab;
