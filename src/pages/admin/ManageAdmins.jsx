import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import { toastSuccess, toastError } from "../../lib/notify";
import { logActivity } from "../../lib/activityLog";
import PageHeader from "../../components/admin/PageHeader";
import { useAuthStore } from "../../store/authStore";

const ManageAdmins = () => {
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .order("added_at", { ascending: false });
    if (!error) setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
    const channel = supabase
      .channel("admins-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "admins" }, () => fetchAdmins())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      const email = newEmail.trim().toLowerCase();
      const { error } = await supabase.from("admins").upsert({
        id: email,
        name: newName || email.split("@")[0],
        added_by: user.email,
      }, { onConflict: "id" });
      if (error) throw error;
      await logActivity("admin_added", `Menambahkan admin baru: ${email}`, user);
      toastSuccess("Admin berhasil ditambahkan");
      setNewEmail("");
      setNewName("");
    } catch (err) {
      toastError("Gagal menambah admin: " + err.message);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (admin.id === user.email) {
      Swal.fire("Gagal", "Anda tidak bisa menghapus akun Anda sendiri.", "error");
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: "Hapus Admin?",
      text: `Akses admin untuk ${admin.id} akan dicabut.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (isConfirmed) {
      try {
        const { error } = await supabase.from("admins").delete().eq("id", admin.id);
        if (error) throw error;
        await logActivity("admin_deleted", `Menghapus admin: ${admin.id}`, user);
        toastSuccess("Admin berhasil dihapus");
      } catch (err) {
        toastError("Gagal menghapus admin: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="fa-user-shield"
        iconTone="indigo"
        title="Manajemen Admin"
        subtitle="Kelola siapa saja yang bisa mengakses dashboard admin"
      />

      {/* Add Admin Form */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-indigo-50 text-indigo-600 shadow-inner">
            <i className="fas fa-user-plus text-xl" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Tambah Admin Baru</h3>
        </div>
        <form onSubmit={handleAddAdmin} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Email Google
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="contoh@gmail.com"
              className="input text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Nama Lengkap (Opsional)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama Admin"
              className="input text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full justify-center h-[42px] rounded-xl text-sm font-bold shadow-md shadow-indigo-200 active:scale-95 transition-all">
              <i className="fas fa-user-check mr-2" />
              Tambah Admin
            </Button>
          </div>
        </form>
        <p className="mt-3 text-[11px] font-medium text-slate-500">
          <i className="fas fa-info-circle mr-1" />
          Admin baru harus login menggunakan Google OAuth dengan email yang didaftarkan.
        </p>
      </div>

      {/* Admin List */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Admin</th>
              <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ditambahkan</th>
              <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="3" className="px-6 py-10 text-center">
                  <i className="fas fa-spinner fa-spin text-slate-300" />
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-10">
                  <EmptyState 
                    icon="fa-user-shield" 
                    title="Belum Ada Admin" 
                    description="Hanya akun @belajar.id yang bisa login otomatis saat ini."
                    isTable={false}
                  />
                </td>
              </tr>
            ) : (
              admins.map((admin) => {
                const displayPhoto = admin.photo_url || (admin.id === user.email ? user.photoURL : null);
                return (
                <tr key={admin.id} className="group hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {displayPhoto ? (
                        <img 
                          src={displayPhoto} 
                          alt={admin.name} 
                          referrerPolicy="no-referrer" 
                          className="h-8 w-8 rounded-full object-cover shadow-sm" 
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">
                          {admin.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-700">{admin.name}</div>
                        <div className="text-xs text-slate-400">{admin.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500">
                      {admin.added_at
                        ? new Date(admin.added_at).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "–"}
                    </div>
                    <div className="text-[10px] text-slate-400">Oleh: {admin.added_by || "Sistem"}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteAdmin(admin)}
                      disabled={admin.id === user.email}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-20"
                      title="Hapus Akses"
                    >
                      <i className="fas fa-trash-can text-xs" />
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageAdmins;
