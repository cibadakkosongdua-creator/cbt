import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { getPassScore } from "../../lib/examConfig";

/**
 * Small area chart showing the student's score trend over their most recent exams.
 * Uses the already-installed `recharts` library.
 */
const ScoreTrendChart = ({ history = [], examConfig = {} }) => {
  const data = useMemo(() => {
    // history is desc by submittedAt → reverse to show oldest→newest (left→right)
    return history
      .slice(0, 10)
      .slice()
      .reverse()
      .map((r, idx) => ({
        idx: idx + 1,
        score: r.score ?? 0,
        label:
          r.submittedAt?.toDate?.().toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          }) ?? `#${idx + 1}`,
      }));
  }, [history]);

  if (data.length < 2) return null;

  const kkm = getPassScore(examConfig);
  const avg = Math.round(
    data.reduce((s, d) => s + d.score, 0) / data.length,
  );

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">
            Grafik Nilai Kamu
          </div>
          <div className="text-xs text-slate-400">
            {data.length} ujian terakhir · Rata-rata {avg}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1.5 text-indigo-600">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Nilai
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="h-0.5 w-3 bg-emerald-500" />
            KKM {kkm}
          </span>
        </div>
      </div>

      <div className="h-36 w-full -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 6, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ stroke: "#c7d2fe", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                padding: "6px 10px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
              labelStyle={{ color: "#64748b", fontSize: 10 }}
              formatter={(v) => [`${v}`, "Nilai"]}
            />
            <ReferenceLine
              y={kkm}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#scoreGradient)"
              dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScoreTrendChart;
