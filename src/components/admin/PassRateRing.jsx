import React from "react";

/**
 * Clean pass-rate ring chart using plain SVG (no recharts dependency for tiny UI).
 * Displays pass rate as a percentage, with total submissions below.
 */
const PassRateRing = ({ passRate = 0, totalSubmissions = 0, passScore = 70 }) => {
  const radius = 52;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, passRate));
  const dashOffset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 75 ? "#10b981" /* emerald */ :
    pct >= 50 ? "#f59e0b" /* amber */ :
    "#ef4444"; /* red */

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-2">
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 800ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-slate-900 tabular-nums leading-none">
            {Math.round(pct)}
            <span className="text-lg font-bold text-slate-400">%</span>
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Tingkat Lulus
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <div className="text-xs font-semibold text-slate-500">
          {totalSubmissions} penyerahan · KKM {passScore}
        </div>
      </div>
    </div>
  );
};

export default PassRateRing;
