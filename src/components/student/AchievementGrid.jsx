import React from "react";
import { computeBadges, REWARDS, ALL_ITEMS } from "../../lib/achievements";

const AchievementGrid = ({ history, examConfig }) => {
  const badges = computeBadges(history, examConfig);
  const earnedCount = badges.filter((b) => b.earned).length;

  // Helper to get reward names for a badge
  const getRewardInfo = (badgeId) => {
    const itemIds = REWARDS[badgeId] || [];
    if (itemIds.length === 0) return null;

    const names = itemIds.map(id => {
      const avatar = ALL_ITEMS.avatars.find(a => a.id === id);
      const border = ALL_ITEMS.borders.find(b => b.id === id);
      return avatar?.title || border?.title;
    }).filter(Boolean);

    return names.length > 0 ? names.join(", ") : null;
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
        <div>
          <div className="text-sm font-black text-slate-900 uppercase tracking-tight">Koleksi Lencana</div>
          <div className="text-[11px] font-bold text-slate-400">
            {earnedCount} dari {badges.length} misi selesai
          </div>
        </div>
        {/* Progress ring */}
        <div className="relative h-11 w-11 shrink-0">
          <svg className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${(earnedCount / badges.length) * 94.25} 94.25`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-indigo-600">
            {Math.round((earnedCount / badges.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4 p-5 sm:grid-cols-4 md:grid-cols-7">
        {badges.map((b) => {
          const rewardNames = getRewardInfo(b.id);
          return (
            <div
              key={b.id}
              className="group flex flex-col items-center gap-2.5 text-center"
            >
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 ${
                  b.earned
                    ? `bg-gradient-to-br ${b.color} shadow-lg shadow-indigo-100`
                    : "bg-slate-100 grayscale"
                }`}
              >
                <i
                  className={`fas ${b.icon} text-2xl ${
                    b.earned ? "text-white drop-shadow-md animate-bounce-subtle" : "text-slate-300"
                  }`}
                />
                {!b.earned && (
                  <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-slate-100">
                    <i className="fas fa-lock text-[10px] text-slate-400" />
                  </div>
                )}
                {b.earned && (
                  <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white shadow-sm">
                    <i className="fas fa-check text-[10px] text-white" />
                  </div>
                )}
                
                {/* Reward Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-40 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-center opacity-0 shadow-2xl transition-all group-hover:mb-4 group-hover:opacity-100 z-[100]">
                  <div className="text-[10px] font-black text-white mb-1">{b.title}</div>
                  <div className="text-[9px] text-slate-400 leading-tight mb-2">{b.desc}</div>
                  {rewardNames && (
                    <div className="border-t border-white/10 pt-1.5">
                      <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hadiah Unlock:</div>
                      <div className="text-[9px] font-bold text-amber-400">{rewardNames}</div>
                    </div>
                  )}
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-slate-900" />
                </div>
              </div>
              <div
                className={`text-[10px] font-black leading-tight uppercase tracking-tight ${
                  b.earned ? "text-slate-800" : "text-slate-400"
                }`}
              >
                {b.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementGrid;
