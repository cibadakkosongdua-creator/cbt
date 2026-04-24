/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { DEFAULT_EXAM_CONFIG, getSubtesLabel, getSubtesBadgeClass, MAPEL_LIST } from "../../lib/examConfig";
import { getQuestionTypeMeta } from "../../lib/uiMeta";
import EmptyState from "../../ui/EmptyState";
import { toastSuccess, toastError } from "../../lib/notify";
import { callGemini } from "../../lib/ai";
import { logActivity } from "../../lib/activityLog";
import { useAuthStore } from "../../store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import ContextMenu from "../../ui/ContextMenu";
import QuestionForm from "./QuestionForm";

import katex from "katex";
import "katex/dist/katex.min.css";
window.katex = katex;

const ManageQuestions = () => {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedMapel, setSelectedMapel] = useState("all");
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [kategoriUI, setKategoriUI] = useState("TKA"); // TKA or MAPEL

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  // Bulk operations
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleContextMenu = (e, q) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options: [
        { label: "Preview Soal", icon: "fa-eye", onClick: () => setPreviewQuestion(q) },
        { label: "Edit Soal", icon: "fa-pen", onClick: () => handleEdit(q) },
        { label: "Duplikasi", icon: "fa-copy", onClick: () => handleDuplicate(q) },
        { type: "divider" },
        { label: "Hapus Soal", icon: "fa-trash", onClick: () => handleDelete(q.id, q.question), danger: true },
      ],
    });
  };

  const [form, setForm] = useState({
    type: "PG",
    subtes: "IPAS",
    stimulus: "",
    question: "",
    image: "",
    options: ["", "", "", ""],
    answer: 0,
    answerMultiple: [],
    answerIsian: "",
    pairs: [{ left: "", right: "" }],
    statements: [{ text: "", isTrue: true }],
    difficulty: "medium",
  });

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setQuestions(
        (data || []).sort(
          (a, b) => (a.subtes || "zzz").localeCompare(b.subtes || "zzz")
        )
      );
    } catch (err) {
      console.error("[CBT] fetchQuestions error:", err);
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    const channel = supabase
      .channel("questions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, () => fetchQuestions())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    let filtered = questions;
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.stimulus?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (selectedType !== "all") {
      filtered = filtered.filter((q) => q.type === selectedType);
    }
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(
        (q) => (q.difficulty || "medium") === selectedDifficulty,
      );
    }
    if (selectedMapel !== "all") {
      filtered = filtered.filter(
        (q) => (q.subtes || "IPAS").toLowerCase() === selectedMapel.toLowerCase(),
      );
    } else {
      // "Semua" respects the active jenis toggle
      if (kategoriUI === "TKA") {
        filtered = filtered.filter((q) => (q.subtes || "literasi") === "literasi" || q.subtes === "numerasi");
      } else {
        filtered = filtered.filter((q) => q.subtes && q.subtes !== "literasi" && q.subtes !== "numerasi");
      }
    }
    setFilteredQuestions(filtered);
  }, [questions, searchTerm, selectedType, selectedDifficulty, selectedMapel, kategoriUI]);

  const validateForm = () => {
    if (!form.question.trim()) {
      Swal.fire("Validasi Gagal", "Pertanyaan harus diisi", "warning");
      return false;
    }

    if (form.type === "PG" || form.type === "PGK") {
      if (form.options.some((opt) => !opt.trim())) {
        Swal.fire("Validasi Gagal", "Semua pilihan harus diisi", "warning");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        type: form.type,
        subtes: form.subtes,
        stimulus: form.stimulus,
        question: form.question,
        image: form.image,
        difficulty: form.difficulty,
        ...(editingId
          ? { updated_at: new Date().toISOString() }
          : {}),
      };

      if (form.type === "PG") {
        payload.options = form.options;
        payload.answer = form.answer;
      } else if (form.type === "PGK") {
        payload.options = form.options;
        payload.answer = form.answerMultiple;
      } else if (form.type === "ISIAN") {
        payload.answer = form.answerIsian.trim().toLowerCase();
      } else if (form.type === "JODOH") {
        payload.pairs = form.pairs;
      } else if (form.type === "BS") {
        payload.statements = form.statements;
      }

      if (editingId) {
        const { error } = await supabase.from("questions").update(payload).eq("id", editingId);
        if (error) throw error;
        await logActivity("question_edited", `Soal diperbarui: "${form.question.substring(0, 50)}..."`, user);
        toastSuccess("Soal berhasil diperbarui");
        setEditingId(null);
      } else {
        const { error } = await supabase.from("questions").insert(payload);
        if (error) throw error;
        await logActivity("question_added", `Soal baru: "${form.question.substring(0, 50)}..."`, user);
        toastSuccess("Soal berhasil disimpan");
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      toastError(err.message || "Gagal menyimpan soal");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setKategoriUI("TKA");
    setForm({
      type: "PG",
      subtes: "literasi",
      stimulus: "",
      question: "",
      image: "",
      options: ["", "", "", ""],
      answer: 0,
      answerMultiple: [],
      answerIsian: "",
      pairs: [{ left: "", right: "" }],
      statements: [{ text: "", isTrue: true }],
      difficulty: "medium",
    });
  };

  const handleDelete = (id, question) => {
    Swal.fire({
      title: "Hapus Soal?",
      html: `<small>${question.substring(0, 50)}...</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Hapus",
    }).then(async (res) => {
      if (res.isConfirmed) {
        const { error } = await supabase.from("questions").delete().eq("id", id);
        if (error) throw error;
        await logActivity("question_deleted", `Soal dihapus: "${question.substring(0, 50)}..."`, user);
        toastSuccess("Soal berhasil dihapus");
      }
    });
  };

  const handleDuplicate = async (q) => {
    try {
      const { id, ...data } = q;
      const stripped = typeof data.question === 'string' ? data.question.replace(/<[^>]*>/g, '') : '';
      const { error } = await supabase.from("questions").insert({
        ...data,
        question: `[SALINAN] ${data.question}`,
      });
      if (error) throw error;
      await logActivity("question_duplicated", `Soal diduplikasi: "${stripped.substring(0, 50)}..."`, user);
      toastSuccess("Soal berhasil diduplikasi!");
    } catch (err) {
      toastError("Gagal menduplikasi soal: " + err.message);
    }
  };

  const handleEdit = (q) => {
    const safeOptions = Array.isArray(q.options) 
      ? q.options.map(o => (o != null ? o.toString() : ""))
      : ["", "", "", ""];

    const qSubtes = q.subtes || "literasi";
    const isTKA = qSubtes === "literasi" || qSubtes === "numerasi";
    setKategoriUI(isTKA ? "TKA" : "MAPEL");

    setForm({
      type: q.type,
      subtes: qSubtes,
      stimulus: q.stimulus != null ? q.stimulus.toString() : "",
      question: q.question != null ? q.question.toString() : "",
      image: q.image || "",
      options: safeOptions.length > 0 ? safeOptions : ["", "", "", ""],
      answer: q.answer !== undefined ? q.answer : 0,
      answerMultiple: q.answer && Array.isArray(q.answer) ? q.answer : [],
      answerIsian: q.answerIsian != null ? q.answerIsian.toString() : (q.answer != null && typeof q.answer === 'string' ? q.answer : ""),
      pairs: q.pairs || [{ left: "", right: "" }],
      statements: q.statements || [{ text: "", isTrue: true }],
      difficulty: q.difficulty || "medium",
    });
    setEditingId(q.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleAiGenerate = async () => {
    const { value: topic, isConfirmed } = await Swal.fire({
      title: "Generate Soal dengan AI",
      input: "text",
      inputLabel: "Topik soal",
      inputPlaceholder: "Contoh: Matematika pecahan kelas 5",
      showCancelButton: true,
      confirmButtonText: "Generate",
      cancelButtonText: "Batal",
    });
    if (!isConfirmed || !topic) return;
    setAiLoading(true);
    try {
      const subtesLabel = form.subtes;
      const prompt = `Buatkan 1 soal pilihan ganda untuk siswa SD untuk mata pelajaran ${subtesLabel} tentang: ${topic}.
Jawab HANYA dalam format JSON berikut, tidak ada teks lain:
{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"difficulty":"easy"}
Catatan: answer adalah index (0-3) dari pilihan yang benar. difficulty bisa easy/medium/hard.`;
      const raw = await callGemini(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format AI tidak valid");
      const parsed = JSON.parse(jsonMatch[0]);
      setForm((prev) => ({
        ...prev,
        type: "PG",
        subtes: form.subtes,
        question: parsed.question || "",
        options: Array.isArray(parsed.options)
          ? parsed.options.slice(0, 4)
          : ["", "", "", ""],
        answer: typeof parsed.answer === "number" ? parsed.answer : 0,
        difficulty: parsed.difficulty || "easy",
      }));
      setShowForm(true);
      toastSuccess("Soal berhasil di-generate! Periksa sebelum menyimpan.");
    } catch (err) {
      toastError("Gagal generate soal: " + (err.message || "Coba lagi"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleImportQuestions = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          Swal.fire("Gagal", "File kosong", "error");
          return;
        }

        const { isConfirmed } = await Swal.fire({
          title: "Konfirmasi Import",
          html: `Akan mengimpor <b>${data.length}</b> soal. Lanjutkan?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Import",
          cancelButtonText: "Batal",
        });
        if (!isConfirmed) return;

        const rows = [];
        let count = 0;
        const keyMap = { A: 0, B: 1, C: 2, D: 3 };
        data.forEach((row) => {
          const question = String(row.PERTANYAAN || "").trim();
          if (!question) return;
          const type = String(row.TIPE || "PG").toUpperCase();
          const kunci = row.KUNCI;
          const answer =
            typeof kunci === "number"
              ? kunci
              : (keyMap[String(kunci).toUpperCase()] ?? 0);
          if (type === "PG") {
            rows.push({
              type: "PG",
              question,
              options: [
                String(row.OPSI_A || ""),
                String(row.OPSI_B || ""),
                String(row.OPSI_C || ""),
                String(row.OPSI_D || ""),
              ].filter(Boolean),
              answer,
              difficulty: String(row.KESULITAN || "easy").toLowerCase(),
              stimulus: "",
              subtes: form.subtes || "literasi",
            });
          } else if (type === "ISIAN") {
            rows.push({
              type: "ISIAN",
              question,
              answer: String(row.KUNCI || ""),
              difficulty: String(row.KESULITAN || "easy").toLowerCase(),
              stimulus: "",
              subtes: form.subtes || "literasi",
            });
          }
          count++;
        });
        if (count === 0) {
          Swal.fire("Gagal", "Tidak ada data valid", "error");
          return;
        }
        const { error: insertErr } = await supabase.from("questions").insert(rows);
        if (insertErr) throw insertErr;
        await logActivity("questions_imported", `${count} soal diimpor dari Excel`, user);
        toastSuccess(`${count} soal berhasil diimpor`);
        e.target.value = "";
      } catch (err) {
        Swal.fire("Gagal", err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: "bg-green-50 text-green-700 border border-green-200",
      medium: "bg-amber-50 text-amber-700 border border-amber-200",
      hard: "bg-red-50 text-red-700 border border-red-200",
    };
    return colors[difficulty] || colors.medium;
  };

  const getTypeColor = (type) => {
    const meta = getQuestionTypeMeta(type);
    return `${meta.badgeClass} border`;
  };

  // Bulk operations
  const toggleSelectId = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    Swal.fire({
      title: "Hapus Soal Terpilih?",
      html: `<b>${selectedIds.size}</b> soal akan dihapus permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Hapus Semua",
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          const { error } = await supabase.from("questions").delete().in("id", [...selectedIds]);
          if (error) throw error;
          await logActivity("questions_bulk_deleted", `${selectedIds.size} soal dihapus secara bulk`, user);
          toastSuccess(`${selectedIds.size} soal dihapus`);
          setSelectedIds(new Set());
        } catch (err) {
          toastError(err.message);
        }
      }
    });
  };

  const handleBulkDuplicate = async () => {
    try {
      const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));
      const dupRows = selectedQuestions.map((q) => {
        const { id, ...data } = q;
        return { ...data };
      });
      const { error } = await supabase.from("questions").insert(dupRows);
      if (error) throw error;
      await logActivity("questions_bulk_duplicated", `${selectedIds.size} soal diduplikat`, user);
      toastSuccess(`${selectedIds.size} soal diduplikat`);
      setSelectedIds(new Set());
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleBulkMoveSubtes = async () => {
    const { value: targetSubtes, isConfirmed } = await Swal.fire({
      title: "Pindah Mapel",
      input: "text",
      inputPlaceholder: "Ketik nama mapel baru (contoh: IPAS)",
      showCancelButton: true,
      confirmButtonText: "Pindahkan",
    });
    if (!isConfirmed || !targetSubtes) return;
    try {
      const { error } = await supabase.from("questions").update({ subtes: targetSubtes }).in("id", [...selectedIds]);
      if (error) throw error;
      await logActivity("questions_bulk_moved", `${selectedIds.size} soal dipindah ke ${targetSubtes}`, user);
      toastSuccess(`${selectedIds.size} soal dipindah ke ${targetSubtes}`);
      setSelectedIds(new Set());
    } catch (err) {
      toastError(err.message);
    }
  };

  // Difficulty counts
  const diffCounts = {
    easy: questions.filter((q) => (q.difficulty || "medium") === "easy").length,
    medium: questions.filter((q) => (q.difficulty || "medium") === "medium").length,
    hard: questions.filter((q) => (q.difficulty || "medium") === "hard").length,
  };

  return (
    <div className="space-y-6">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-50 blur-2xl"></div>
          <div className="relative flex flex-col h-full justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Soal</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner">
                <i className="fas fa-book-open" />
              </div>
            </div>
            <div className="text-4xl font-black text-slate-800">{questions.length}</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-50 blur-2xl"></div>
          <div className="relative flex flex-col h-full justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Soal Latihan (TKA)</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 shadow-inner">
                <i className="fas fa-brain" />
              </div>
            </div>
            <div className="text-4xl font-black text-cyan-700 truncate">
              {questions.filter((q) => q.subtes === "literasi" || q.subtes === "numerasi").length}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-50 blur-2xl"></div>
          <div className="relative flex flex-col h-full justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Soal Ulangan (Mapel)</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-inner">
                <i className="fas fa-graduation-cap" />
              </div>
            </div>
            <div className="text-4xl font-black text-orange-600">
               {questions.filter((q) => q.subtes !== "literasi" && q.subtes !== "numerasi").length}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className={`group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed transition-all p-3 w-full ${
              showForm
                ? "border-red-300 bg-red-50 text-red-600 hover:border-red-400"
                : "border-indigo-300 bg-indigo-50 text-indigo-600 hover:border-indigo-400"
            }`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm transition-transform group-hover:scale-110 ${showForm ? "text-red-500" : "text-indigo-500"}`}>
              <i className={`fas ${showForm ? "fa-times" : "fa-plus"}`} />
            </div>
            <span className="text-xs font-bold">{showForm ? "Batal Tambah" : "Soal Baru"}</span>
          </button>
          
          <div className="flex gap-2 h-[45px] w-full">
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 text-[11px] font-bold text-white shadow-sm shadow-violet-200 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-60 transition inline-flex items-center justify-center"
              title="Generate dengan AI"
            >
              <i className={`fas ${aiLoading ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"} mr-1 text-violet-100`} /> AI
            </button>
            <label className="flex-1 cursor-pointer flex items-center justify-center rounded-2xl bg-emerald-50 px-2 text-[11px] font-bold text-emerald-600 hover:bg-emerald-100 border border-emerald-100 transition whitespace-nowrap" title="Import via Excel">
              <i className="fas fa-file-excel mr-1" /> Excel
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImportQuestions} />
            </label>
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedIds(new Set());
              }}
              className={`flex-1 flex items-center justify-center rounded-2xl border px-2 text-[11px] font-bold transition whitespace-nowrap ${
                selectMode
                  ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Pilih Banyak Soal"
            >
              <i className={`fas ${selectMode ? "fa-times" : "fa-check-double"} mr-1`} /> Pilih
            </button>
          </div>
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <QuestionForm
          form={form}
          setForm={setForm}
          handleSubmit={handleSubmit}
          loading={loading}
          editingId={editingId}
          resetForm={resetForm}
          setShowForm={setShowForm}
          kategoriUI={kategoriUI}
          setKategoriUI={setKategoriUI}
          MAPEL_LIST={MAPEL_LIST}
          getSubtesLabel={getSubtesLabel}
        />
      )}

      {/* FILTER & SEARCH */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cari Soal
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="text"
                placeholder="Pertanyaan atau bacaan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tipe Soal
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input text-sm"
            >
              <option value="all">Semua Tipe</option>
              <option value="PG">Pilihan Ganda</option>
              <option value="PGK">Pilihan Ganda K</option>
              <option value="ISIAN">Isian</option>
              <option value="JODOH">Menjodohkan</option>
              <option value="BS">Benar/Salah</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600">
              {filteredQuestions.length} / {questions.length} Soal
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* ── Level 1: Jenis ── */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Jenis:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
            {[
              { id: "TKA", label: "TKA", icon: "fa-brain" },
              { id: "MAPEL", label: "Mapel", icon: "fa-graduation-cap" },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setKategoriUI(t.id);
                  setSelectedMapel("all");
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  kategoriUI === t.id
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
            type="button"
            onClick={() => setSelectedMapel("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selectedMapel === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >Semua</button>

          {kategoriUI === "TKA" ? (
            /* TKA sub-chips */
            ["literasi", "numerasi"].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedMapel(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedMapel === s
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                }`}
              >{getSubtesLabel(s)}</button>
            ))
          ) : (
            /* Mapel Dropdown (Rapi & tidak makan tempat) */
            <select
              value={selectedMapel === "all" ? "all" : selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 outline-none transition hover:bg-purple-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
            >
              <option value="all">Pilih Mapel (Semua)</option>
              {MAPEL_LIST.map(m => (
                <option key={m} value={m}>{getSubtesLabel(m)}</option>
              ))}
            </select>
          )}

          {/* ── Tingkat Kesulitan ── */}
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
              type="button"
              onClick={() => setSelectedDifficulty(chip.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedDifficulty === chip.id ? chip.active : chip.color
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* QUESTION LIST */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {initialLoading ? (
          <div className="space-y-4 p-6 bg-slate-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-[22px] border border-slate-200 bg-white p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <div className="h-5 w-16 rounded-full bg-slate-100" />
                      <div className="h-5 w-20 rounded-full bg-slate-100" />
                      <div className="h-5 w-24 rounded-full bg-slate-100" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-slate-100" />
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-slate-100" />
                    <div className="h-8 w-8 rounded-lg bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <table className="w-full">
            <tbody>
              <EmptyState 
                icon="fa-box-open" 
                title="Bank Soal Masih Kosong" 
                description={searchTerm ? "Tidak ada soal yang cocok dengan pencarian atau filter Anda." : "Bank soal ini belum memiliki pertanyaan. Silakan klik 'Soal Baru' atau gunakan fitur Generate AI."}
                colSpan={1} 
              />
            </tbody>
          </table>
        ) : (
          <div className="grid max-h-[600px] gap-3 overflow-y-auto p-4 md:p-6 bg-slate-50">
            <AnimatePresence>
              {filteredQuestions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.3) }}
                  onContextMenu={(e) => handleContextMenu(e, q)}
                  className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md cursor-context-menu"
                >
                  <div className="flex items-start gap-4">
                    {/* Select checkbox */}
                    {selectMode && (
                      <div className="flex pt-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelectId(q.id)}
                          className="h-4 w-4 cursor-pointer rounded accent-indigo-600"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getTypeColor(q.type)}`}
                        >
                          {q.type}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${getSubtesBadgeClass(q.subtes || "literasi")}`}
                        >
                          {getSubtesLabel(q.subtes || "literasi")}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getDifficultyColor(q.difficulty || "medium")}`}
                        >
                          {q.difficulty === "easy"
                            ? "Mudah"
                            : q.difficulty === "medium"
                              ? "Sedang"
                              : "Sulit"}
                        </span>
                        {q.stimulus && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Ada Bacaan
                          </span>
                        )}
                      </div>
                      <div 
                        className="line-clamp-2 text-sm font-semibold text-slate-900 html-content"
                        dangerouslySetInnerHTML={{ __html: typeof q.question === 'object' ? (q.question?.text || "") : String(q.question || "") }}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-2 transition-opacity">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                        title="Preview"
                      >
                        <i className="fas fa-eye text-xs" />
                      </button>
                      <button
                        onClick={() => handleEdit(q)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                        title="Edit"
                      >
                        <i className="fas fa-pen text-xs" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(q)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                        title="Duplikasi"
                      >
                        <i className="fas fa-copy text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id, q.question)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                        title="Hapus"
                      >
                        <i className="fas fa-trash text-xs" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectMode && selectedIds.size > 0 && (
        <motion.div 
          initial={{ y: 100, x: "-50%" }}
          animate={{ y: 0, x: "-50%" }}
          exit={{ y: 100, x: "-50%" }}
          className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 transform"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                {selectedIds.size}
              </span>
              <span className="text-sm font-semibold text-slate-700">soal dipilih</span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <button
              onClick={selectAll}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Pilih Semua
            </button>
            <button
              onClick={deselectAll}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
            >
              Batal Pilih
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <button
              onClick={handleBulkDuplicate}
              className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <i className="fas fa-copy text-[10px]" /> Duplikat
            </button>
            <button
              onClick={handleBulkMoveSubtes}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <i className="fas fa-arrow-right-arrow-left text-[10px]" /> Pindah
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <i className="fas fa-trash text-[10px]" /> Hapus
            </button>
          </div>
        </motion.div>
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            {...contextMenu}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {previewQuestion && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <i className="fas fa-eye text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Preview Soal
                </h3>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            <div className="space-y-5 p-6 text-slate-900">
              {previewQuestion.stimulus && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bacaan / Stimulus
                  </p>
                  <div 
                    className="html-content text-sm leading-relaxed text-slate-700"
                    dangerouslySetInnerHTML={{ __html: typeof previewQuestion.stimulus === 'object' ? (previewQuestion.stimulus?.text || "") : String(previewQuestion.stimulus || "") }}
                  />
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Pertanyaan
                </p>
                <div 
                  className="html-content text-base font-semibold leading-relaxed text-slate-900"
                  dangerouslySetInnerHTML={{ __html: typeof previewQuestion.question === 'object' ? (previewQuestion.question?.text || "") : String(previewQuestion.question || "") }}
                />
              </div>

              {previewQuestion.image && typeof previewQuestion.image === 'string' && previewQuestion.image.trim() !== '' && (
                <div className="flex justify-center">
                  <img
                    src={previewQuestion.image}
                    alt="Gambar soal"
                    className="max-h-64 w-auto rounded-xl border border-slate-200 object-contain shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              {previewQuestion.type === "PG" && (
                <div className="space-y-2">
                  {previewQuestion.options?.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-sm font-medium ${
                        previewQuestion.answer === idx
                          ? "border-green-400 bg-green-50 text-green-800"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                      <div 
                        className="html-content flex-1"
                        dangerouslySetInnerHTML={{ __html: typeof opt === 'object' && opt !== null ? (opt.text || opt.label || "") : String(opt || "") }}
                      />
                      {previewQuestion.answer === idx && (
                        <span className="ml-2 font-bold shrink-0">✓ Kunci</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.type === "PGK" && (
                <div className="space-y-2">
                  {previewQuestion.options?.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-sm font-medium ${
                        Array.isArray(previewQuestion.answer) &&
                        previewQuestion.answer.includes(idx)
                          ? "border-green-400 bg-green-50 text-green-800"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                      <div 
                        className="html-content flex-1"
                        dangerouslySetInnerHTML={{ __html: typeof opt === 'object' && opt !== null ? (opt.text || opt.label || "") : String(opt || "") }}
                      />
                      {Array.isArray(previewQuestion.answer) &&
                        previewQuestion.answer.includes(idx) && (
                          <span className="ml-2 font-bold shrink-0">✓</span>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.type === "ISIAN" && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-600">
                    Kunci Jawaban
                  </p>
                  <p className="text-sm font-semibold text-green-800">
                    {previewQuestion.answer}
                  </p>
                </div>
              )}

              {previewQuestion.type === "JODOH" && (
                <div className="space-y-2">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Pasangan (Matching)
                  </p>
                  {previewQuestion.pairs?.map((pair, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex-1 html-content text-sm font-medium text-slate-800" dangerouslySetInnerHTML={{ __html: typeof pair.left === 'object' && pair.left !== null ? (pair.left.text || "") : String(pair.left || "") }} />
                      <i className="fas fa-arrow-right mx-3 text-slate-400" />
                      <div className="flex-1 html-content text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: typeof pair.right === 'object' && pair.right !== null ? (pair.right.text || "") : String(pair.right || "") }} />
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.type === "BS" && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Pernyataan (Benar/Salah)
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_88px_88px] border-b border-slate-200 bg-slate-50">
                      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Pernyataan
                      </div>
                      <div className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-green-600">
                        Benar
                      </div>
                      <div className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-red-500">
                        Salah
                      </div>
                    </div>
                    {/* Rows */}
                    {previewQuestion.statements?.map((stmt, idx) => (
                      <div
                        key={idx}
                        className={`grid grid-cols-[1fr_88px_88px] border-b border-slate-100 last:border-0 ${
                          stmt.isTrue ? "bg-green-50/60" : "bg-red-50"
                        }`}
                      >
                        {/* Teks */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                            {idx + 1}
                          </span>
                          <div 
                            className="html-content text-sm font-medium leading-relaxed text-slate-900 flex-1"
                            dangerouslySetInnerHTML={{ __html: typeof stmt.text === 'object' && stmt.text !== null ? (stmt.text.text || "") : String(stmt.text || "") }}
                          />
                        </div>
                        {/* Kunci Benar */}
                        <div className="flex items-center justify-center px-2 py-3">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                              stmt.isTrue
                                ? "border-green-500 bg-green-500 shadow-sm shadow-green-200"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            {stmt.isTrue && (
                              <i className="fas fa-check text-[11px] text-white" />
                            )}
                          </div>
                        </div>
                        {/* Kunci Salah */}
                        <div className="flex items-center justify-center px-2 py-3">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                              !stmt.isTrue
                                ? "border-red-500 bg-red-50 shadow-sm shadow-red-200"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            {!stmt.isTrue && (
                              <i className="fas fa-xmark text-[11px] text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default ManageQuestions;
