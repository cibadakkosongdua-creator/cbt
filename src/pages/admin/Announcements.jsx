import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import { useAuthStore } from "../../store/authStore";
import { toastSuccess, toastError } from "../../lib/notify";
import { logActivity } from "../../lib/activityLog";
import EmptyState from "../../ui/EmptyState";
import PageHeader from "../../components/admin/PageHeader";

const TYPE_OPTIONS = [
  { value: "info", label: "ℹ️ Informasi", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "fa-circle-info" },
  { value: "warning", label: "⚠️ Peringatan", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "fa-triangle-exclamation" },
  { value: "success", label: "✅ Kabar Baik", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "fa-circle-check" },
];

const Announcements = () => {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "info" });

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setAnnouncements((data || []).map((a) => ({ ...a, createdAt: a.created_at ? new Date(a.created_at) : new Date() })));
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
    const channel = supabase
      .channel("announcements-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => fetchAnnouncements())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      Swal.fire("Validasi", "Judul dan isi pengumuman harus diisi", "warning");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("announcements").insert({
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        created_by: user?.name || "Admin",
        is_active: true,
      });
      if (error) throw error;
      await logActivity("announcement_created", `Pengumuman: "${form.title.trim()}"`, user);
      setForm({ title: "", body: "", type: "info" });
      setShowForm(false);
      toastSuccess("Pengumuman berhasil dibuat");
    } catch (err) {
      toastError(err.message || "Gagal membuat pengumuman");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ann) => {
    try {
      const { error } = await supabase.from("announcements").update({ is_active: !ann.is_active }).eq("id", ann.id);
      if (error) throw error;
      await logActivity("announcement_toggled", `"${ann.title}" → ${ann.is_active ? "Nonaktif" : "Aktif"}`, user);
      toastSuccess(`Pengumuman ${ann.is_active ? "dinonaktifkan" : "diaktifkan"}`);
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleDelete = (ann) => {
    Swal.fire({
      title: "Hapus Pengumuman?",
      html: `<small>${ann.title}</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Hapus",
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          const { error } = await supabase.from("announcements").delete().eq("id", ann.id);
        if (error) throw error;
          await logActivity("announcement_deleted", `Pengumuman: "${ann.title}"`, user);
          toastSuccess("Pengumuman dihapus");
        } catch (err) {
          toastError(err.message);
        }
      }
    });
  };

  const getTypeMeta = (type) =>
    TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[0];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="fa-bullhorn"
        iconTone="amber"
        title="Daftar Pengumuman"
        subtitle="Buat dan kelola informasi yang akan dilihat oleh semua siswa di dashboard mereka"
        badge={{
          label: `${announcements.filter((a) => a.isActive).length} Aktif`,
          tone: "emerald",
          icon: "fa-circle",
        }}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex h-[42px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all w-full md:w-auto ${
              showForm
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 hover:shadow-lg"
            }`}
          >
            <i className={`fas ${showForm ? "fa-times" : "fa-plus"}`} />
            {showForm ? "Batal Tambah" : "Buat Baru"}
          </button>
        }
      />

      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 mb-6 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-1">
          <div className="rounded-[22px] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <i className="fas fa-bullhorn" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Tulis Pengumuman Baru
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Judul <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <i className="fas fa-heading text-sm" />
                  </span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Contoh: Jadwal Ujian Berubah"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Isi Pengumuman <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute top-3 left-4 text-slate-400">
                    <i className="fas fa-align-left text-sm" />
                  </span>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Tulis detail pengumuman..."
                    rows="3"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tipe Label
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.value })}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${
                        form.type === opt.value
                          ? `${opt.bg} ${opt.border} ${opt.text} shadow-sm ring-2 ring-white`
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <i className={`fas ${opt.icon}`} /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
              >
                <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-paper-plane"} mr-2`} />
                {saving ? "Menyimpan..." : "Posting Pengumuman"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <table className="w-full">
            <tbody>
              <EmptyState
                icon="fa-bullhorn"
                title="Belum Ada Pengumuman"
                description="Buat pengumuman pertama untuk siswa Anda."
                colSpan={1}
              />
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.map((ann) => {
              const meta = getTypeMeta(ann.type);
              return (
                <div
                  key={ann.id}
                  className={`flex items-start gap-4 px-6 py-5 transition ${
                    !ann.is_active ? "opacity-50" : ""
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}
                  >
                    <i className={`fas ${meta.icon} text-sm ${meta.text}`} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900">
                        {ann.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          ann.is_active
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {ann.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {ann.body}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <span>
                        <i className="fas fa-user mr-1" />
                        {ann.created_by}
                      </span>
                      <span>
                        <i className="fas fa-calendar mr-1" />
                        {ann.createdAt.toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleToggle(ann)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        ann.is_active
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                          : "bg-green-50 text-green-600 hover:bg-green-100"
                      }`}
                      title={ann.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <i
                        className={`fas ${
                          ann.is_active ? "fa-eye-slash" : "fa-eye"
                        } text-xs`}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(ann)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                      title="Hapus"
                    >
                      <i className="fas fa-trash text-xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
