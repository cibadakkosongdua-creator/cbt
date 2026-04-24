import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getSubtesLabel, getSubtesBadgeClass } from "../lib/examConfig";
import { getInitials, getAvatarGrad } from "../lib/avatarUtils";
import { ALL_ITEMS, computeStudentStats } from "../lib/achievements";

/**
 * SVG Donut Score Ring
 */
const ScoreRing = ({ score, pass }) => {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const dash = (pct / 100) * circ;
  const color = pass ? "#10b981" : "#ef4444"; // emerald-500 / red-500
  const trackColor = pass ? "#d1fae5" : "#fee2e2";

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 64 64" className="-rotate-90">
        {/* Track */}
        <circle cx="32" cy="32" r={r} fill="none" stroke={trackColor} strokeWidth="7" />
        {/* Progress */}
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset="0"
        />
      </svg>
      <span className={`absolute text-[11px] font-black ${pass ? "text-emerald-600" : "text-red-600"}`}>
        {pct}
      </span>
    </div>
  );
};

/**
 * StudentProfileModal — self-contained, fetches its own data from Firestore.
 * Props:
 *   student  — { studentId, studentName, kelas }  (from result row)
 *            OR { id, name, kelas }                 (from students list)
 *   passScore — KKM number
 *   onClose   — callback
 */
const StudentProfileModal = ({ student, passScore = 70, onClose }) => {
  const [history, setHistory] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!student) return;
      setLoading(true);
      try {
        const studentId = student.student_id || student.studentId || student.id;

        // Fetch history
        const { data: histData, error: histError } = await supabase
          .from("results")
          .select("*")
          .eq("student_id", studentId);
        if (histError) throw histError;
        const results = (histData || []).map(r => ({
          ...r,
          submittedAt: r.submitted_at ? new Date(r.submitted_at) : new Date(),
        }));
        results.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        setHistory(results);

        // Fetch student details (photo, border, birth info)
        const { data: studData, error: studError } = await supabase
          .from("students")
          .select("photo_url, active_border, tempat_lahir, tanggal_lahir")
          .eq("id", studentId)
          .single();
        if (!studError) setStudentDetails(studData);
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [student]);

  if (!student) return null;

  const studentName  = student.studentName || student.name || "–";
  const studentId    = student.studentId   || student.id   || "–";
  const studentKelas = student.kelas || "–";
  const photoURL     = student.photoURL || student.photo_url || studentDetails?.photo_url;
  const activeBorder = student.activeBorder || student.active_border || studentDetails?.active_border;
  const tempatLahir  = student.tempat_lahir || student.tempatLahir || studentDetails?.tempat_lahir || "–";
  const tanggalLahir = student.tanggal_lahir || student.tanggalLahir || studentDetails?.tanggal_lahir || "–";

  const stats = computeStudentStats(history, { minScore: passScore });
  const { avgScore, passedCount: passCount, totalExams } = stats;

  // Dynamic header hue from name
  const hue = (studentName).charCodeAt(0) * 3 % 360;
  const initials = getInitials(studentName);
  const borderClass = ALL_ITEMS.borders.find(b => b.id === (activeBorder || "none"))?.class || "border-[3px] border-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header Banner ── */}
        <div
          className="h-28 w-full"
          style={{ background: `linear-gradient(135deg, hsl(${hue},70%,50%), hsl(${(hue + 50) % 360},70%,45%))` }}
        >
          {/* dot grid */}
          <div className="h-full w-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)`,
            backgroundSize: "20px 20px",
          }} />
        </div>

        {/* ── Close ── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition"
        >
          <i className="fas fa-times text-sm" />
        </button>

        {/* ── Avatar (overlapping banner) ── */}
        <div className="absolute left-6 top-14">
          <div
            className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white text-xl font-black text-white shadow-xl ${borderClass}`}
          >
            {photoURL ? (
              <img src={photoURL} alt={studentName} className="h-full w-full object-cover" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGrad(studentName)}`}>
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* ── Identity ── */}
        <div className="px-6 pt-8 pb-3">
          <div className="ml-24">
            <h2 className="text-lg font-black text-slate-900 truncate">{studentName}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                <i className="fas fa-id-card text-[9px]" /> {studentId}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                <i className="fas fa-school text-[9px]" /> Kelas {studentKelas}
              </span>
              {(tempatLahir !== "–" || tanggalLahir !== "–") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                  <i className="fas fa-cake-candles text-[9px]" /> {tempatLahir}, {tanggalLahir}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                loading ? "bg-slate-100 text-slate-400" :
                passCount === totalExams && totalExams > 0 ? "bg-emerald-50 border border-emerald-200 text-emerald-700" :
                "bg-amber-50 border border-amber-200 text-amber-700"
              }`}>
                <i className={`fas ${loading ? "fa-circle-notch fa-spin" : passCount === totalExams && totalExams > 0 ? "fa-star" : "fa-chart-bar"} text-[9px]`} />
                {loading ? "Memuat..." : passCount === totalExams && totalExams > 0 ? "Semua Lulus" : `${passCount} dari ${totalExams} Lulus`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="mx-6 mb-4 grid grid-cols-3 gap-2.5">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center animate-pulse">
                <div className="mx-auto mb-2 h-8 w-8 rounded-xl bg-slate-200" />
                <div className="h-5 w-10 mx-auto rounded-lg bg-slate-200 mb-1" />
                <div className="h-2 w-12 mx-auto rounded bg-slate-100" />
              </div>
            ))
          ) : (
            [
              { label: "Total Ujian", value: totalExams,  icon: "fa-file-alt",   color: "text-indigo-600 bg-indigo-50" },
              { label: "Rata-rata",   value: avgScore !== null ? `${avgScore}` : "–", suffix: avgScore !== null ? "%" : "", icon: "fa-chart-line", color: "text-amber-600 bg-amber-50" },
              { label: "Lulus",       value: `${passCount}/${totalExams}`, icon: "fa-trophy", color: "text-emerald-600 bg-emerald-50" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl ${s.color}`}>
                  <i className={`fas ${s.icon} text-sm`} />
                </div>
                <div className="text-lg font-black text-slate-800 leading-tight">
                  {s.value}<span className="text-xs">{s.suffix || ""}</span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))
          )}
        </div>

        {/* ── Exam History ── */}
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Riwayat Ujian</h3>
            {!loading && <span className="text-[11px] font-semibold text-slate-400">{totalExams} ujian</span>}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <i className="fas fa-inbox text-slate-400" />
              </div>
              <div className="text-sm font-semibold text-slate-500">Belum ada riwayat ujian</div>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {history.map(r => {
                const pass = (r.score ?? 0) >= passScore;
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5 hover:bg-slate-50 transition">
                    {/* SVG Donut Ring */}
                    <ScoreRing score={r.score ?? 0} pass={pass} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] font-bold text-slate-800 truncate">{r.examName || "Ujian"}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getSubtesBadgeClass(r.subtes || "literasi")}`}>
                          {getSubtesLabel(r.subtes || "literasi")}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{r.correct ?? 0}/{r.total ?? 0} benar</span>
                        <span>·</span>
                        <span>
                          {r.submittedAt?.toDate
                            ? r.submittedAt.toDate().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                            : r.submittedAt instanceof Date
                              ? r.submittedAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                              : "–"}
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black ${
                      pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {pass ? "LULUS" : "GAGAL"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfileModal;
