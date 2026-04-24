import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { supabase } from "../lib/supabase";

import Swal from "sweetalert2";
import Page from "../ui/Page";
import Container from "../ui/Container";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { DEFAULT_EXAM_CONFIG } from "../lib/examConfig";
import { getQuestionTypeMeta } from "../lib/uiMeta";
import Certificate from "../components/Certificate";

const ResultsView = ({ resultId }) => {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [examConfig, setExamConfig] = useState(null);
  const certRef = useRef(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data: rData, error: rErr } = await supabase.from("results").select("*").eq("id", resultId).single();
        if (rErr) throw rErr;
        if (rData) {
          const data = { 
            ...rData, 
            studentName: rData.student_name,
            studentId: rData.student_id,
            examName: rData.exam_name,
            passScore: rData.pass_score,
            submittedAt: rData.submitted_at ? new Date(rData.submitted_at) : new Date() 
          };
          setResult(data);

          const pScore = data.pass_score || 70;
          if ((data.score ?? 0) >= pScore) {
            setTimeout(() => {
              confetti({
                particleCount: 180,
                spread: 80,
                origin: { y: 0.55 },
                colors: ["#10b981", "#6ee7b7", "#fbbf24", "#a78bfa"],
              });
            }, 600);
          }

          // Fetch exam config for "showResults" setting
          const { data: cData } = await supabase.from("settings").select("*").eq("id", 1).single();
          
          if (cData) {
            // Priority 1: show_results (Snake Case from DB)
            // Priority 2: showResults (Camel Case fallback)
            // Priority 3: Default from examConfig
            let showResultsValue = DEFAULT_EXAM_CONFIG.showResults;
            
            if (cData.show_results !== undefined && cData.show_results !== null) {
              showResultsValue = cData.show_results;
            } else if (cData.showResults !== undefined && cData.showResults !== null) {
              showResultsValue = cData.showResults;
            }
            
            const normalized = {
              ...DEFAULT_EXAM_CONFIG,
              ...cData,
              showResults: Boolean(showResultsValue),
            };
            setExamConfig(normalized);
          } else {
            setExamConfig(DEFAULT_EXAM_CONFIG);
          }

          // Ambil hanya soal yang dipakai saat ujian ini
          const qIds = data.question_ids || [];
          if (qIds.length > 0) {
            const { data: qData } = await supabase.from("questions").select("*").in("id", qIds);
            const qMap = Object.fromEntries((qData || []).map((d) => [d.id, d]));
            setQuestions(qIds.map((id) => qMap[id]).filter(Boolean));
          } else {
            setQuestions([]);
          }
        }
      } catch (error) {
        console.error("Error fetching result:", error);
        Swal.fire("Error", "Tidak bisa memuat hasil ujian", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  if (loading) {
    return (
      <Page className="flex items-center">
        <Container className="py-16">
          <Card className="p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <i className="fas fa-spinner fa-spin text-xl" />
            </div>
            <div className="text-sm font-semibold text-slate-600">
              Memuat hasil...
            </div>
          </Card>
        </Container>
      </Page>
    );
  }

  if (!result) {
    return (
      <Page className="flex items-center">
        <Container className="py-16">
          <Card className="p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-200">
              <i className="fas fa-triangle-exclamation text-xl" />
            </div>
            <div className="text-lg font-bold text-slate-900">
              Hasil tidak ditemukan
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              ID: <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{resultId}</span>
              <br/>
              Cek kembali koneksi internet atau dashboard admin.
            </div>
            <div className="mt-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
              >
                <i className="fas fa-arrow-left" />
                Kembali
              </Button>
            </div>
          </Card>
        </Container>
      </Page>
    );
  }

  const getAnswerStatus = (questionId) => {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return null;

    const userAnswer = result.answers?.[questionId];
    const correct = q.answer;

    let isCorrect = false;
    if (q.type === "PG") {
      const normUser = userAnswer !== undefined && userAnswer !== null ? String(userAnswer).trim() : "";
      const normCorrect = correct !== undefined && correct !== null ? String(correct).trim() : "";
      
      // Handle letter answers (A-E)
      const isLetter = /^[A-E]$/i.test(normCorrect);
      if (isLetter) {
        const userLetter = String.fromCharCode(65 + Number(userAnswer));
        isCorrect = userLetter.toUpperCase() === normCorrect.toUpperCase();
      } else {
        isCorrect = Number(normUser) === Number(normCorrect);
      }
    } else if (q.type === "PGK") {
      const userArr = (Array.isArray(userAnswer) ? userAnswer : []).map(String).sort();
      const corrArr = (Array.isArray(correct) ? correct : []).map(String).sort();
      isCorrect = userArr.length > 0 && JSON.stringify(userArr) === JSON.stringify(corrArr);
    } else if (q.type === "ISIAN") {
      isCorrect = userAnswer?.toLowerCase().trim() === String(correct || "").toLowerCase().trim();
    } else if (q.type === "JODOH") {
      isCorrect = q.pairs?.every((_, idx) => Number(userAnswer?.[idx]) === idx);
    } else if (q.type === "BS") {
      isCorrect = q.statements?.every(
        (stmt, idx) => userAnswer?.[idx] === stmt.isTrue,
      );
    }

    return { isCorrect, userAnswer, correct, q };
  };

  const passScore = Number(result.pass_score || result.passScore || DEFAULT_EXAM_CONFIG.minScore);
  const userScore = Number(result.score || 0);
  const isPassed = userScore >= passScore;
  const isKilatKuning = userScore >= 90 && result.duration > 0 && result.duration <= (result.duration_limit || 60) / 2;

  return (
    <Page>
      <Container className="py-6 pb-10 md:py-10">
        {/* ── Result Header Card ── */}
        <div
          className={`relative overflow-hidden rounded-2xl shadow-sm mb-8 ${
            isKilatKuning
              ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600"
              : isPassed
                ? "bg-gradient-to-br from-green-600 to-emerald-700"
                : "bg-gradient-to-br from-red-600 to-rose-700"
          }`}
        >
          {/* Subtle sparkle effect for Kilat Kuning */}
          {isKilatKuning && (
            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "20px 20px",
            }} />
          )}

          <div className="relative p-8 md:p-10 text-white">
            <div className="text-center">
              <div className="text-6xl mb-4">{isKilatKuning ? "⚡" : isPassed ? "🎉" : "📚"}</div>
              <div className="text-3xl font-bold">
                {isKilatKuning ? "Luar Biasa! KILAT KUNING ⚡" : isPassed ? "Selamat, Kamu Lulus!" : "Jangan Menyerah!"}
              </div>
              <div className="mt-1 text-white/70">
                {isKilatKuning 
                  ? "Kamu menyelesaikan ujian dengan sangat cepat dan nilai sempurna!" 
                  : isPassed
                    ? "Hasil ujian memuaskan."
                    : "Terus belajar dan coba lagi."}
              </div>
            </div>

            {/* Score summary */}
            <div className="mt-8 grid grid-cols-3 gap-4 rounded-xl bg-white/10 p-6">
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Nilai
                </div>
                <div className="mt-1 text-5xl font-bold">{result.score}</div>
              </div>
              <div className="border-x border-white/20 text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Benar
                </div>
                <div className="mt-1 text-3xl font-bold">
                  {Number(result.correct).toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                  <span className="text-xl text-white/60">/{result.total}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  KKM
                </div>
                <div className="mt-1 text-3xl font-bold">{passScore}</div>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <i className="fas fa-book" />
                {result.subtes || "Ujian"}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fas fa-calendar-check" />
                {result.submittedAt?.toDate?.().toLocaleString("id-ID") || "–"}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fas fa-stopwatch" />
                Durasi: {result.duration ?? "–"} menit
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fas fa-circle-question" />
                Tidak dijawab:{" "}
                {result.total - Object.keys(result.answers || {}).length} soal
              </span>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row no-print">
          <button
            onClick={() => {
              // Print with full question detail
              const printWin = window.open("", "_blank");
              if (!printWin) return;
              const pScore = result.pass_score || 70;
              const isPassed2 = (result.score ?? 0) >= pScore;
              const statusColor = isPassed2 ? "#059669" : "#dc2626";
              const qRows = questions.map((q, idx) => {
                const st = getAnswerStatus(q.id);
                if (!st) return "";
                const stripped = (q.question || "").replace(/<[^>]*>/g, "").substring(0, 120);
                return `<tr>
                  <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px">${idx + 1}</td>
                  <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px">${stripped}${stripped.length >= 120 ? "..." : ""}</td>
                  <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px">${q.type}</td>
                  <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:${st.isCorrect ? "#059669" : "#dc2626"};font-size:11px">${st.isCorrect ? "✓ Benar" : "✗ Salah"}</td>
                </tr>`;
              }).join("");
              printWin.document.write(`<!DOCTYPE html><html><head><title>Detail Hasil - ${result.student_name}</title>
              <style>
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Segoe UI',system-ui,sans-serif;padding:24px;color:#1e293b;max-width:800px;margin:0 auto;font-size:12px}
                .header{text-align:center;border-bottom:3px solid #4f46e5;padding-bottom:12px;margin-bottom:20px}
                .header h1{font-size:18px;color:#4f46e5;margin-bottom:2px}
                .header p{font-size:11px;color:#64748b}
                .info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
                .info div{padding:8px;border:1px solid #e2e8f0;border-radius:6px}
                .info .label{font-size:9px;text-transform:uppercase;font-weight:700;color:#94a3b8;letter-spacing:0.5px}
                .info .val{font-size:13px;font-weight:700;color:#1e293b}
                .score-bar{display:flex;align-items:center;justify-content:center;gap:24px;padding:16px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;margin-bottom:16px}
                .score-bar .big{font-size:36px;font-weight:900;color:${statusColor}}
                .score-bar .meta{font-size:12px;color:#64748b}
                table{width:100%;border-collapse:collapse;margin-bottom:12px}
                th{padding:8px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569}
                .footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0}
                @media print{body{padding:12px}}
              </style></head><body>
              <div class="header">
                <h1>DETAIL HASIL UJIAN</h1>
                <p>SDN 02 Cibadak — Smart CBT</p>
              </div>
              <div class="info">
                <div><div class="label">Nama</div><div class="val">${result.student_name || "-"}</div></div>
                <div><div class="label">Kelas</div><div class="val">${result.kelas || "-"}</div></div>
                <div><div class="label">Mapel/Subtes</div><div class="val">${result.subtes || "-"}</div></div>
                <div><div class="label">Ujian</div><div class="val">${result.exam_name || "Ujian"}</div></div>
                <div><div class="label">Tanggal</div><div class="val">${result.submittedAt instanceof Date ? result.submittedAt.toLocaleDateString("id-ID") : "-"}</div></div>
                <div><div class="label">Durasi</div><div class="val">${result.duration ?? "-"} menit</div></div>
              </div>
              <div class="score-bar">
                <div class="big">${result.score ?? 0}</div>
                <div>
                  <div class="meta" style="font-weight:700;color:${statusColor}">${isPassed2 ? "LULUS" : "BELUM LULUS"}</div>
                  <div class="meta">Benar: ${result.correct}/${result.total} · KKM: ${pScore}</div>
                </div>
              </div>
              <table>
                <thead><tr><th>No</th><th style="text-align:left">Pertanyaan</th><th>Tipe</th><th>Status</th></tr></thead>
                <tbody>${qRows}</tbody>
              </table>
              <div class="footer">Dicetak pada ${new Date().toLocaleString("id-ID")} · Smart CBT SDN 02 Cibadak</div>
              <script>setTimeout(()=>{window.print();},500)<\/script>
              </body></html>`);
              printWin.document.close();
            }}
            className="btn btn-outline flex-1 py-3"
          >
            <i className="fas fa-print" /> Cetak Detail Lengkap
          </button>
          <button
            onClick={() => {
              const printWin = window.open('', '_blank');
              if (!printWin || !certRef.current) return;
              printWin.document.write(`
                <html><head><title>Sertifikat - ${result.student_name}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
                <style>body{margin:0;}</style></head>
                <body>${certRef.current.innerHTML}
                <script>setTimeout(()=>{window.print();window.close();},500)<\/script>
                </body></html>
              `);
              printWin.document.close();
            }}
            className="btn btn-outline flex-1 py-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <i className="fas fa-award" /> Cetak Sertifikat
          </button>
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost flex-1 py-3"
          >
            <i className="fas fa-arrow-left" /> Kembali ke Dashboard
          </button>
          <button
            onClick={() => {
              const text = `Halo Ayah/Bunda! Saya baru saja menyelesaikan ujian *${result.examName}* di *Smart CBT SDN 02 Cibadak*.\n\n*Hasil Ujian:*\nNama: ${result.studentName}\nSkor: *${result.score}*\nStatus: *${isPassed ? "LULUS ✓" : "BELUM LULUS"}*\n\nLihat detailnya di sini:\n${window.location.href}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className="btn btn-outline flex-1 py-3 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
          >
            <i className="fab fa-whatsapp" /> Bagikan ke Orang Tua
          </button>
        </div>

        {/* ── Answer Details ── */}
        {examConfig?.showResults !== false ? (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Detail Jawaban</h2>

            <div className="animate-fade-in space-y-2">
              {questions.map((q, idx) => {
                const status = getAnswerStatus(q.id);
                if (!status) return null;
                const typeMeta = getQuestionTypeMeta(q.type);

                return (
                  <div
                    key={q.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      onClick={() =>
                        setExpandedQuestion(
                          expandedQuestion === q.id ? null : q.id,
                        )
                      }
                      className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-slate-50"
                    >
                      {/* Status icon */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                          status.isCorrect ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        <i
                          className={`fas ${status.isCorrect ? "fa-check" : "fa-xmark"} text-xs`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-400">
                            Soal {idx + 1}
                          </span>
                          <span className={`badge ${typeMeta.badgeClass}`}>
                            {typeMeta.shortLabel}
                          </span>
                        </div>
                        <div
                          className="html-content text-sm font-semibold text-slate-800 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: q.question }}
                        />
                      </div>

                      <i
                        className={`fas fa-chevron-down text-slate-300 text-xs transition-transform ${
                          expandedQuestion === q.id ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expandedQuestion === q.id && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                        {q.stimulus && (
                          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 italic">
                            <span className="not-italic font-semibold text-slate-500 text-xs uppercase tracking-wider block mb-2">
                              Teks Bacaan
                            </span>
                            <div dangerouslySetInnerHTML={{ __html: q.stimulus }} className="html-content" />
                          </div>
                        )}

                        {q.image && (
                          <div className="flex justify-center">
                            <img
                              src={q.image}
                              alt="Gambar soal"
                              className="max-h-48 w-auto rounded-xl border border-slate-200 object-contain shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        {/* PG */}
                        {q.type === "PG" && (
                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isUserAnswer = status.userAnswer === optIdx;
                              const isCorrectAnswer = optIdx === status.correct;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-3 rounded-xl border-2 p-3 ${
                                    isUserAnswer && status.isCorrect
                                      ? "border-green-300 bg-green-50"
                                      : isUserAnswer && !status.isCorrect
                                        ? "border-red-300 bg-red-50"
                                        : isCorrectAnswer && !isUserAnswer
                                          ? "border-green-200 bg-green-50"
                                          : "border-slate-100 bg-white"
                                  }`}
                                >
                                  <div
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                      isUserAnswer
                                        ? status.isCorrect
                                          ? "bg-green-500 text-white"
                                          : "bg-red-500 text-white"
                                        : isCorrectAnswer
                                          ? "bg-green-400 text-white"
                                          : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </div>
                                  <div
                                    className="html-content flex-1 text-sm text-slate-700 font-medium"
                                    dangerouslySetInnerHTML={{ __html: opt }}
                                  />
                                  {isUserAnswer && (
                                    <span className="ml-auto text-xs font-semibold text-slate-400">
                                      Jawaban Anda
                                    </span>
                                  )}
                                  {isCorrectAnswer && !isUserAnswer && (
                                    <span className="ml-auto text-xs font-semibold text-green-600">
                                      Kunci
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* ISIAN */}
                        {q.type === "ISIAN" && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                                Jawaban Anda
                              </div>
                              <div 
                                className="html-content text-sm font-semibold text-slate-800"
                                dangerouslySetInnerHTML={{ __html: status.userAnswer || "(Tidak dijawab)" }}
                              />
                            </div>
                            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-400">
                                Kunci Jawaban
                              </div>
                              <div 
                                className="html-content text-sm font-semibold text-slate-800"
                                dangerouslySetInnerHTML={{ __html: status.correct }}
                              />
                            </div>
                          </div>
                        )}

                        {/* BS */}
                        {q.type === "BS" && (
                          <div className="space-y-2">
                            {q.statements?.map((stmt, sIdx) => {
                              const correct =
                                status.userAnswer?.[sIdx] === stmt.isTrue;
                              return (
                                <div
                                  key={sIdx}
                                  className={`rounded-xl border-2 p-4 ${
                                    correct
                                      ? "border-green-200 bg-green-50"
                                      : "border-red-200 bg-red-50"
                                  }`}
                                >
                                  <div 
                                    className="html-content text-sm font-semibold text-slate-800 mb-2"
                                    dangerouslySetInnerHTML={{ __html: stmt.text }}
                                  />
                                  <div className="flex items-center gap-3 text-xs font-semibold">
                                    <span
                                      className={
                                        correct
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }
                                    >
                                      Jawaban:{" "}
                                      {status.userAnswer?.[sIdx]
                                        ? "BENAR"
                                        : "SALAH"}
                                    </span>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-slate-500">
                                      Kunci: {stmt.isTrue ? "BENAR" : "SALAH"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* JODOH */}
                        {q.type === "JODOH" && (
                          <div className="space-y-2">
                            {q.pairs?.map((pair, pIdx) => {
                              const correct = status.userAnswer?.[pIdx] === pIdx;
                              return (
                                <div
                                  key={pIdx}
                                  className={`flex items-center gap-3 rounded-xl border-2 p-3 ${
                                    correct
                                      ? "border-green-200 bg-green-50"
                                      : "border-red-200 bg-red-50"
                                  }`}
                                >
                                  <div 
                                    className="flex-1 html-content text-sm font-semibold text-slate-800"
                                    dangerouslySetInnerHTML={{ __html: pair.left }}
                                  />
                                  <i
                                    className={`fas fa-arrow-right text-xs ${
                                      correct ? "text-green-400" : "text-red-400"
                                    }`}
                                  />
                                  <div 
                                    className="flex-1 html-content text-sm text-slate-600"
                                    dangerouslySetInnerHTML={{ __html: pair.right }}
                                  />
                                  <i
                                    className={`fas ${correct ? "fa-check text-green-500" : "fa-xmark text-red-500"} text-xs`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* PGK */}
                        {q.type === "PGK" && (
                          <div className="space-y-2">
                            {q.options?.map((opt, oIdx) => {
                              const isSelected =
                                Array.isArray(status.userAnswer) &&
                                status.userAnswer.includes(oIdx);
                              const isCorrect =
                                Array.isArray(status.correct) &&
                                status.correct.includes(oIdx);
                              return (
                                <div
                                  key={oIdx}
                                  className={`flex items-center gap-3 rounded-xl border-2 p-3 ${
                                    isSelected && isCorrect
                                      ? "border-green-300 bg-green-50"
                                      : isSelected && !isCorrect
                                        ? "border-red-300 bg-red-50"
                                        : !isSelected && isCorrect
                                          ? "border-amber-300 bg-amber-50"
                                          : "border-slate-100 bg-white"
                                  }`}
                                >
                                  <i
                                    className={`fas ${isSelected ? "fa-square-check" : "fa-square"} ${
                                      isSelected
                                        ? isCorrect
                                          ? "text-green-500"
                                          : "text-red-500"
                                        : "text-slate-300"
                                    }`}
                                  />
                                  <div
                                    className="html-content flex-1 text-sm text-slate-700 font-medium"
                                    dangerouslySetInnerHTML={{ __html: opt }}
                                  />
                                  {!isSelected && isCorrect && (
                                    <span className="ml-auto text-xs font-semibold text-amber-600">
                                      Seharusnya dipilih
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ShowResults is FALSE - Display friendly message */
          <Card className="p-8 text-center border-amber-100 bg-amber-50/50">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm">
              <i className="fas fa-lock text-xl" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Detail Jawaban Dikunci</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              Maaf, administrator menonaktifkan fitur untuk melihat kunci jawaban dan detail pembahasan soal pada ujian ini.
            </p>
          </Card>
        )}
      </Container>

      {/* Hidden Certificate for printing */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={certRef}>
          <Certificate result={result} examConfig={examConfig} />
        </div>
      </div>
    </Page>
  );
};

export default ResultsView;
