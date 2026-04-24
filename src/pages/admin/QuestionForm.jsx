import React, { useState, useEffect } from "react";
import RichTextEditor from "../../ui/RichTextEditor";

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['image', 'formula'],
    ['clean']
  ],
};

const quillOptionsModules = {
  toolbar: [
    ['bold', 'italic', 'strike'],
    ['formula']
  ],
};

const QuestionForm = ({ 
  form, 
  setForm, 
  handleSubmit, 
  loading, 
  editingId, 
  resetForm, 
  setShowForm, 
  kategoriUI, 
  setKategoriUI,
  MAPEL_LIST,
  getSubtesLabel
}) => {
  // Local state for the editor to avoid parent re-renders on every keystroke
  // However, since the parent 'form' is used for many things, we need to be careful.
  
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="flex items-center gap-2">
          <i className={`fas ${editingId ? "fa-pen" : "fa-plus-circle"} text-indigo-600`} />
          <h3 className="text-base font-bold text-slate-900">
            {editingId ? "Edit Soal" : "Buat Soal Baru"}
          </h3>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <i className="fas fa-times" /> Tutup
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* ROW 1: TIPE, SUBTES, KESULITAN */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tipe Soal *
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input font-semibold"
            >
              <option value="PG">Pilihan Ganda (PG)</option>
              <option value="PGK">Pilihan Ganda Kompleks (PGK)</option>
              <option value="ISIAN">Isian Singkat</option>
              <option value="JODOH">Menjodohkan</option>
              <option value="BS">Benar/Salah</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-shrink-0 w-1/3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Kategori
              </label>
              <select
                value={kategoriUI}
                onChange={(e) => {
                  const val = e.target.value;
                  setKategoriUI(val);
                  setForm({ ...form, subtes: val === "TKA" ? "literasi" : "IPAS" });
                }}
                className="input font-semibold"
              >
                <option value="TKA">Latihan (TKA)</option>
                <option value="MAPEL">Ulangan (Mapel)</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {kategoriUI === "TKA" ? "Subtes TKA" : "Nama Mata Pelajaran"}
              </label>
              {kategoriUI === "TKA" ? (
                <select
                  value={form.subtes}
                  onChange={(e) => setForm({ ...form, subtes: e.target.value })}
                  className="input font-semibold"
                >
                  <option value="literasi">🔵 Literasi</option>
                  <option value="numerasi">🟠 Numerasi</option>
                </select>
              ) : (
                <select
                  value={form.subtes}
                  onChange={(e) => setForm({ ...form, subtes: e.target.value })}
                  className="input font-semibold"
                >
                  {MAPEL_LIST.map((m) => (
                    <option key={m} value={m}>
                      {getSubtesLabel(m)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tingkat Kesulitan
            </label>
            <select
              value={form.difficulty}
              onChange={(e) =>
                setForm({ ...form, difficulty: e.target.value })
              }
              className="input font-semibold"
            >
              <option value="easy">🟢 Mudah</option>
              <option value="medium">🟡 Sedang</option>
              <option value="hard">🔴 Sulit</option>
            </select>
          </div>
        </div>

        {/* STIMULUS */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Stimulus / Bacaan (Opsional)
          </label>
          <div className="bg-white rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200">
            <RichTextEditor
              modules={quillModules}
              value={form.stimulus}
              onChange={(val) => {
                setForm({ ...form, stimulus: val });
              }}
              placeholder="Wacana, cerita, atau teks pendukung..."
              className="w-full text-slate-900 border-none"
            />
          </div>
        </div>

        {/* GAMBAR SOAL */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            URL Gambar (Opsional)
          </label>
          <input
            type="url"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="https://contoh.com/gambar-soal.png"
            className="input text-sm"
          />
          {form.image && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <img
                src={form.image}
                alt="Preview gambar soal"
                className="max-h-40 w-auto rounded-lg object-contain mx-auto"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
              <div className="hidden items-center justify-center gap-2 py-3 text-xs text-red-500" style={{ display: "none" }}>
                <i className="fas fa-exclamation-triangle" />
                Gambar tidak bisa dimuat. Periksa URL.
              </div>
            </div>
          )}
        </div>

        {/* PERTANYAAN */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pertanyaan / Soal *
          </label>
          <div className="bg-white rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200">
            <RichTextEditor
              modules={quillModules}
              value={form.question}
              onChange={(val) => {
                setForm({ ...form, question: val });
              }}
              placeholder="Tuliskan pertanyaan..."
              className="w-full text-slate-900 border-none"
            />
          </div>
        </div>

        {/* PG / PGK OPTIONS */}
        {(form.type === "PG" || form.type === "PGK") && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pilihan &amp; Kunci Jawaban
            </label>
            <div className="space-y-3">
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type={form.type === "PG" ? "radio" : "checkbox"}
                    name="answer"
                    checked={
                      form.type === "PG"
                        ? form.answer === idx
                        : form.answerMultiple.includes(idx)
                    }
                    onChange={() => {
                      if (form.type === "PG")
                        setForm({ ...form, answer: idx });
                      else {
                        const newMult = form.answerMultiple.includes(idx)
                          ? form.answerMultiple.filter((i) => i !== idx)
                          : [...form.answerMultiple, idx];
                        setForm({ ...form, answerMultiple: newMult });
                      }
                    }}
                    className="h-4 w-4 cursor-pointer accent-indigo-600"
                  />
                  <span className="w-6 text-sm font-bold text-indigo-600">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <div className="flex-1 bg-white rounded-lg border border-slate-200 compact-quill focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200">
                    <RichTextEditor
                      modules={quillOptionsModules}
                      value={opt}
                      onChange={(val) => {
                        const newOpts = [...form.options];
                        newOpts[idx] = val;
                        setForm({ ...form, options: newOpts });
                      }}
                      placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                      className="w-full text-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ISIAN */}
        {form.type === "ISIAN" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Kunci Jawaban *
            </label>
            <input
              type="text"
              value={form.answerIsian}
              onChange={(e) =>
                setForm({ ...form, answerIsian: e.target.value })
              }
              placeholder="Jawaban yang benar..."
              className="input"
            />
          </div>
        )}

        {/* JODOH */}
        {form.type === "JODOH" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pasangan Soal (Kolom Kiri &amp; Kanan)
            </label>
            <div className="space-y-3">
              {form.pairs.map((pair, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-slate-500">
                      Kiri {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => {
                        const newPairs = form.pairs.map((p, i) =>
                          i === idx ? { ...p, left: e.target.value } : p
                        );
                        setForm({ ...form, pairs: newPairs });
                      }}
                      placeholder="Misal: Ibu Kota"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-slate-500">
                      Kanan {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => {
                        const newPairs = form.pairs.map((p, i) =>
                          i === idx ? { ...p, right: e.target.value } : p
                        );
                        setForm({ ...form, pairs: newPairs });
                      }}
                      placeholder="Misal: Jakarta"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        pairs: form.pairs.filter((_, i) => i !== idx),
                      })
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                  >
                    <i className="fas fa-trash text-xs" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  pairs: [...form.pairs, { left: "", right: "" }],
                })
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <i className="fas fa-plus" /> Tambah Pasangan
            </button>
          </div>
        )}

        {/* BS */}
        {form.type === "BS" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pernyataan &amp; Jawaban
            </label>
            <div className="space-y-3">
              {form.statements.map((stmt, idx) => (
                <div
                  key={idx}
                  className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Pernyataan {idx + 1}
                    </label>
                    <textarea
                      value={stmt.text}
                      onChange={(e) => {
                        const newStmts = form.statements.map((s, i) =>
                          i === idx ? { ...s, text: e.target.value } : s
                        );
                        setForm({ ...form, statements: newStmts });
                      }}
                      placeholder="Contoh: Ibukota Indonesia adalah Jakarta"
                      rows="2"
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Jawaban Benar?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newStmts = form.statements.map((s, i) =>
                          i === idx ? { ...s, isTrue: !s.isTrue } : s
                        );
                        setForm({ ...form, statements: newStmts });
                      }}
                      className={`rounded-lg px-4 py-1 text-xs font-bold transition ${
                        stmt.isTrue
                          ? "bg-green-500 text-white"
                          : "bg-red-50 text-white"
                      }`}
                    >
                      {stmt.isTrue ? "✓ BENAR" : "✗ SALAH"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        statements: form.statements.filter((_, i) => i !== idx),
                      })
                    }
                    className="flex w-full items-center justify-center gap-1.5 py-1 text-[10px] font-bold text-red-400 hover:text-red-600"
                  >
                    <i className="fas fa-trash" /> Hapus Pernyataan
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  statements: [...form.statements, { text: "", isTrue: true }],
                })
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <i className="fas fa-plus" /> Tambah Pernyataan
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i
              className={`fas ${loading ? "fa-spinner fa-spin" : editingId ? "fa-sync" : "fa-save"}`}
            />
            {loading
              ? "Menyimpan..."
              : editingId
                ? "Perbarui Soal"
                : "Simpan Soal"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="btn btn-outline px-6 py-3 text-sm"
            >
              Batal
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;
