import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import { toastSuccess, toastError } from "../../lib/notify";
import { useReactToPrint } from "react-to-print";
import PrintCards from "../../components/PrintCards";
import { useRef } from "react";
import { logActivity } from "../../lib/activityLog";
import { useAuthStore } from "../../store/authStore";
import StudentProfileModal from "../../ui/StudentProfileModal";
import { getPassScore, DEFAULT_EXAM_CONFIG } from "../../lib/examConfig";
import { getAvatarGrad, getInitials } from "../../lib/avatarUtils";

const KELAS_LIST = [
  "1A",
  "1B",
  "2A",
  "2B",
  "3A",
  "3B",
  "4A",
  "4B",
  "5A",
  "5B",
  "6A",
  "6B",
];

const ManageStudents = () => {
  const { user } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [examTitle, setExamTitle] = useState("Kartu Ujian CBT");
  const [passScore, setPassScore] = useState(getPassScore(DEFAULT_EXAM_CONFIG));
  
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Kartu Ujian CBT",
  });

  const [formData, setFormData] = useState({
    nisn: "",
    name: "",
    kelas: "",
    tempatLahir: "",
    tanggalLahir: "",
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null); // for profile modal
  const [editForm, setEditForm] = useState({
    name: "",
    kelas: "",
    tempatLahir: "",
    tanggalLahir: "",
    alamat: "",
  });

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error("[CBT] fetchStudents error:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    const channel = supabase
      .channel("students-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => fetchStudents())
      .subscribe();

    // Fetch settings for exam title & pass score
    supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        if (data.title) setExamTitle(data.title);
        setPassScore(getPassScore(data));
      }
    });

    const settingsChannel = supabase
      .channel("settings-students-ch")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, (payload) => {
        const d = payload.new;
        if (d.title) setExamTitle(d.title);
        setPassScore(getPassScore(d));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  useEffect(() => {
    let filtered = students;
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.id?.includes(search),
      );
    }
    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [students, search]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.nisn || !formData.name) {
      Swal.fire("Validasi Gagal", "NISN dan Nama harus diisi", "warning");
      return;
    }

    try {
      console.log("[ManageStudents] Saving:", formData);
      const { error, data } = await supabase.from("students").upsert({
        id: formData.nisn,
        name: formData.name,
        kelas: formData.kelas || "-",
        tempat_lahir: formData.tempatLahir || null,
        tanggal_lahir: formData.tanggalLahir || null,
        nisn: formData.nisn,
        password: formData.nisn,
      }, { onConflict: "id" });
      console.log("[ManageStudents] Result:", { error, data });
      if (error) throw error;
      setFormData({
        nisn: "",
        name: "",
        kelas: "",
        tempatLahir: "",
        tanggalLahir: "",
      });
      setShowForm(false);
      toastSuccess("Siswa berhasil ditambahkan");
      await logActivity("student_added", `Siswa ditambah: ${formData.name} (NISN: ${formData.nisn}, Kelas: ${formData.kelas})`, user);
    } catch (err) {
      toastError(err.message || "Gagal menambah siswa");
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: `Hapus ${name}?`,
      text: "Data ini akan hilang permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Hapus!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { error } = await supabase.from("students").delete().eq("id", id);
          if (error) throw error;
          toastSuccess("Data siswa telah dihapus");
          await logActivity("student_deleted", `Siswa dihapus: ${name} (NISN: ${id})`, user);
        } catch (error) {
          toastError(error.message || "Gagal menghapus siswa");
        }
      }
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.name) {
      toastError("Nama tidak boleh kosong");
      return;
    }
    try {
      const { error } = await supabase.from("students").update({
        name: editForm.name,
        kelas: editForm.kelas,
        tempat_lahir: editForm.tempatLahir,
        tanggal_lahir: editForm.tanggalLahir,
      }).eq("id", editingStudent.id);
      if (error) throw error;
      setEditingStudent(null);
      toastSuccess("Data siswa berhasil diperbarui");
      await logActivity("student_edited", `Siswa diedit: ${editForm.name} (NISN: ${editingStudent.id})`, user);
    } catch (err) {
      toastError(err.message || "Gagal menyimpan");
    }
  };

  // Normalisasi key kolom: huruf kecil, hapus spasi/underscore/strip
  const normKey = (k) =>
    String(k)
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  // Cari nilai dari row berdasarkan berbagai kemungkinan nama kolom
  const findCol = (row, variants) => {
    const normalized = {};
    Object.entries(row).forEach(([k, v]) => {
      normalized[normKey(k)] = v;
    });
    for (const v of variants) {
      const val = normalized[normKey(v)];
      if (val !== undefined && val !== null) return String(val).trim();
    }
    return "";
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        NISN: "0012345678",
        NAMA: "Contoh Nama Siswa",
        KELAS: "4A",
        TEMPAT_LAHIR: "Jakarta",
        TANGGAL_LAHIR: "2014-05-10",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    // Atur lebar kolom
    ws["!cols"] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 8 },
      { wch: 20 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");
    XLSX.writeFile(wb, "template_import_siswa.xlsx");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      Swal.fire(
        "Gagal",
        "Hanya file Excel (.xlsx, .xls) yang diterima",
        "error",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          Swal.fire(
            "Gagal",
            "File Excel kosong atau format tidak sesuai",
            "error",
          );
          return;
        }

        Swal.fire({
          title: "Konfirmasi Import",
          html: `Akan mengimpor <b>${data.length}</b> data siswa. Lanjutkan?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Ya, Impor",
          cancelButtonText: "Batal",
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const rows = [];
              let imported = 0;

              data.forEach((row) => {
                const nisn = findCol(row, ["NISN", "nisn", "Nisn"]);
                const name = findCol(row, [
                  "NAMA",
                  "nama",
                  "Nama",
                  "name",
                  "Name",
                ]);
                if (nisn && name) {
                  const rowData = {
                    id: nisn,
                    name,
                    nisn,
                    password: nisn,
                  };
                  
                  const kelas = findCol(row, ["KELAS", "kelas", "Kelas", "class", "Class"]);
                  if (kelas !== undefined && kelas !== "") rowData.kelas = kelas;
                  
                  const tempatLahir = findCol(row, [
                    "TEMPAT_LAHIR", "tempat lahir", "Tempat Lahir", "TempatLahir",
                    "tempatlahir", "tempat_lahir", "Tempat_Lahir", "TEMPAT LAHIR",
                    "TEMPAT", "Tempat", "tempat"
                  ]);
                  if (tempatLahir !== undefined && tempatLahir !== "") rowData.tempat_lahir = tempatLahir;
                  
                  const tanggalLahir = findCol(row, [
                    "TANGGAL_LAHIR", "tanggal lahir", "Tanggal Lahir", "TanggalLahir",
                    "tanggallahir", "tanggal_lahir", "Tanggal_Lahir", "TANGGAL LAHIR",
                    "TANGGAL", "Tanggal", "tanggal", "DOB", "dob"
                  ]);
                  if (tanggalLahir !== undefined && tanggalLahir !== "") rowData.tanggal_lahir = tanggalLahir;

                  rows.push(rowData);
                  imported++;
                }
              });

              if (imported === 0) {
                Swal.fire(
                  "Gagal",
                  "Tidak ada data yang valid. Periksa kolom NISN dan NAMA, atau gunakan template yang tersedia.",
                  "error",
                );
                return;
              }

              const { error: upsertErr } = await supabase.from("students").upsert(rows, { onConflict: "id" });
              if (upsertErr) throw upsertErr;
              toastSuccess(`${imported} data siswa berhasil diimpor`);
              await logActivity("students_imported", `${imported} siswa diimpor dari Excel`, user);
              e.target.value = "";
            } catch (error) {
              Swal.fire("Gagal", "Error: " + error.message, "error");
            }
          }
        });
      } catch (error) {
        Swal.fire("Gagal", "Error membaca file: " + error.message, "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-50 blur-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Siswa
              </div>
              <div className="text-4xl font-black text-slate-800">
                {students.length}
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
              <i className="fas fa-users text-xl" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-50 blur-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Ditampilkan
              </div>
              <div className="text-4xl font-black text-slate-800">
                {filteredStudents.length}
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-200">
              <i className="fas fa-eye text-xl" />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData({ nisn: "", name: "", kelas: "", tempatLahir: "", tanggalLahir: "" });
            setShowForm(!showForm);
          }}
          className={`group flex h-full min-h-[100px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed transition-all ${
            showForm
              ? "border-red-300 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100"
              : "border-indigo-300 bg-indigo-50 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-100"
          }`}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm transition-transform group-hover:scale-110 ${showForm ? "text-red-500" : "text-indigo-500"}`}>
            <i className={`fas ${showForm ? "fa-times" : "fa-plus"}`} />
          </div>
          <span className="text-sm font-bold">{showForm ? "Batal Tambah" : "Tambah Siswa Baru"}</span>
        </button>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 mb-6 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-1">
          <div className="rounded-[22px] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                 <i className="fas fa-user-plus" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Data Siswa Baru
              </h3>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    NISN <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <i className="fas fa-id-card text-sm" />
                    </span>
                    <input
                      type="text"
                      placeholder="001234..."
                      value={formData.nisn}
                      onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <i className="fas fa-user text-sm" />
                    </span>
                    <input
                      type="text"
                      placeholder="Nama lengkap..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Kelas
                  </label>
                  <div className="relative">
                     <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <i className="fas fa-door-open text-sm" />
                    </span>
                    <select
                      value={formData.kelas}
                      onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                    >
                      <option value="">Pilih Kelas</option>
                      {KELAS_LIST.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tempat Lahir
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <i className="fas fa-map-marker-alt text-sm" />
                    </span>
                    <input
                      type="text"
                      placeholder="Kota..."
                      value={formData.tempatLahir}
                      onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={formData.tanggalLahir}
                  onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 md:w-1/2"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary mt-4 w-full"
              >
                <i className="fas fa-save" /> Simpan Siswa
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH */}
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <i className="fas fa-search text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 min-w-max">
            <div className="flex h-[50px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600">
              {filteredStudents.length} <span className="font-medium text-slate-400 ml-1">Siswa</span>
            </div>
            
            <label className="flex h-[50px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 text-sm font-bold tracking-wide text-emerald-600 transition hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200">
              <i className="fas fa-file-excel" /> <span className="hidden sm:inline">Import</span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleImport}
              />
            </label>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-bold tracking-wide text-slate-600 transition hover:bg-slate-100 border border-slate-200 hover:border-slate-300"
              title="Download template Excel"
            >
              <i className="fas fa-download" /> <span className="hidden sm:inline">Template</span>
            </button>
            
            <button
              onClick={() => {
                if (filteredStudents.length === 0) {
                  return Swal.fire("Kosong", "Tidak ada data siswa untuk dicetak", "warning");
                }
                handlePrint();
              }}
              disabled={filteredStudents.length === 0}
              className="flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-bold tracking-wide text-white shadow-md shadow-violet-200 transition hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50"
            >
              <i className="fas fa-print" /> <span className="hidden sm:inline">Cetak Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Komponen cetak (tersembunyi) */}
      <PrintCards ref={printRef} students={filteredStudents} examTitle={examTitle} />

      {/* TABLE */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {initialLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "23%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    No
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    NISN
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nama
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kelas
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tempat, Tanggal Lahir
                  </th>
                  <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <EmptyState 
                    icon="fa-user-graduate" 
                    title="Belum Ada Siswa" 
                    description={search ? "Tidak ada siswa yang cocok dengan pencarian Anda." : "Data siswa masih kosong. Silakan tambah manual atau import dari Excel."}
                    colSpan={6} 
                  />
                ) : (
                  (() => {
                    const startIdx = (currentPage - 1) * itemsPerPage;
                    const paginatedData = filteredStudents.slice(
                      startIdx,
                      startIdx + itemsPerPage,
                    );

                    return paginatedData.map((s, idx) => (
                      <tr
                        key={s.id}
                        className="group border-b border-slate-100 transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 text-sm text-slate-400 font-medium">
                          {startIdx + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5">
                            {s.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left group/name max-w-[200px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent({ studentId: s.id, studentName: s.name, kelas: s.kelas });
                            }}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                              {(s.photo_url || s.photoURL) ? (
                                <img src={s.photo_url || s.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                              ) : (
                                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGrad(s.name)} text-[10px] font-black text-white`}>
                                  {getInitials(s.name)}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-slate-900 group-hover/name:text-indigo-600 transition-colors truncate whitespace-nowrap" title={s.name}>{s.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                            <i className="fas fa-chalkboard text-[9px]" />
                            {s.kelas || "–"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500" title={`${s.tempat_lahir}, ${s.tanggal_lahir}`}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-700">{s.tempat_lahir || "–"}</span>
                            <span className="text-slate-300">,</span>
                            <span className="text-slate-500">{s.tanggal_lahir || "–"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent({ studentId: s.id, studentName: s.name, kelas: s.kelas });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                              title="Lihat Profil"
                            >
                              <i className="fas fa-user text-xs" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingStudent(s);
                                setEditForm({
                                  name: s.name,
                                  kelas: s.kelas || "",
                                  tempatLahir: s.tempat_lahir || "",
                                  tanggalLahir: s.tanggal_lahir || "",
                                });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                              title="Edit"
                            >
                              <i className="fas fa-pen text-xs" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                              title="Hapus"
                            >
                              <i className="fas fa-trash text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!initialLoading && filteredStudents.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="text-sm text-slate-500">
              Menampilkan{" "}
              {Math.min(
                (currentPage - 1) * itemsPerPage + 1,
                filteredStudents.length,
              )}{" "}
              - {Math.min(currentPage * itemsPerPage, filteredStudents.length)}{" "}
              dari {filteredStudents.length} siswa
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-50"
              >
                <i className="fas fa-chevron-left mr-1" /> Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  {
                    length: Math.ceil(filteredStudents.length / itemsPerPage),
                  },
                  (_, i) => i + 1,
                ).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      prev + 1,
                      Math.ceil(filteredStudents.length / itemsPerPage),
                    ),
                  )
                }
                disabled={
                  currentPage ===
                  Math.ceil(filteredStudents.length / itemsPerPage)
                }
                className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-50"
              >
                Next <i className="fas fa-chevron-right ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <i className="fas fa-pen text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Edit Siswa: {editingStudent.id}
              </h3>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Kelas
                </label>
                <select
                  value={editForm.kelas}
                  onChange={(e) =>
                    setEditForm({ ...editForm, kelas: e.target.value })
                  }
                  className="input"
                >
                  <option value="">Pilih Kelas</option>
                  {KELAS_LIST.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={editForm.tempatLahir}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tempatLahir: e.target.value })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={editForm.tanggalLahir}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tanggalLahir: e.target.value })
                  }
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn btn-primary flex-1 text-sm"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="btn btn-outline flex-1 text-sm"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          passScore={passScore}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};

export default ManageStudents;
