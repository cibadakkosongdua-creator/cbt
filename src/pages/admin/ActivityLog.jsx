import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import { ACTION_META } from "../../lib/activityLog";
import EmptyState from "../../ui/EmptyState";
import PageHeader from "../../components/admin/PageHeader";

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isClearing, setIsClearing] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setLogs((data || []).map((l) => ({ ...l, timestamp: l.created_at ? new Date(l.created_at) : new Date() })));
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel("activity-logs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => fetchLogs())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const actionTypes = [...new Set(logs.map((l) => l.action))].sort();

  const handleClearLogs = async () => {
    const result = await Swal.fire({
      title: "Bersihkan Semua Log?",
      text: "Seluruh riwayat aktivitas admin akan dihapus secara permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Bersihkan",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    setIsClearing(true);
    try {
      const { data: ids, error: selErr } = await supabase.from("activity_logs").select("id");
      if (selErr) throw selErr;
      const allIds = ids.map((d) => d.id);
      const CHUNK = 500;
      for (let i = 0; i < allIds.length; i += CHUNK) {
        const chunk = allIds.slice(i, i + CHUNK);
        const { error: delErr } = await supabase.from("activity_logs").delete().in("id", chunk);
        if (delErr) throw delErr;
      }
      Swal.fire("Berhasil", "Semua riwayat aktivitas telah dibersihkan.", "success");
    } catch (error) {
      console.error("Error clearing logs:", error);
      Swal.fire("Gagal", "Terjadi kesalahan saat membersihkan log.", "error");
    } finally {
      setIsClearing(false);
    }
  };

  const filteredLogs =
    filterAction === "all"
      ? logs
      : logs.filter((l) => l.action === filterAction);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="fa-clock-rotate-left"
        iconTone="violet"
        title="Activity Log"
        subtitle="Riwayat semua aksi admin di platform"
        badge={{
          label: `${filteredLogs.length} Aktivitas`,
          tone: "violet",
          icon: "fa-list",
        }}
      />

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shadow-inner">
            <i className="fas fa-filter text-base" />
          </div>
          <div className="flex-1">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full sm:w-64 rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:border-violet-500 focus:bg-white focus:ring-violet-200/50 outline-none"
            >
              <option value="all">Semua Jenis Aksi</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {ACTION_META[a]?.label || a}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {logs.length > 0 && (
          <button
            onClick={handleClearLogs}
            disabled={isClearing}
            className="group flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`fas ${isClearing ? 'fa-spinner fa-spin' : 'fa-trash-alt'} text-red-500`} />
            {isClearing ? 'Membersihkan...' : 'Bersihkan Semua Log'}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <table className="w-full">
            <tbody>
              <EmptyState
                icon="fa-clock-rotate-left"
                title="Belum Ada Aktivitas"
                description="Riwayat aksi admin akan muncul di sini secara otomatis."
                colSpan={1}
              />
            </tbody>
          </table>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paginatedLogs.map((log) => {
                const meta = ACTION_META[log.action] || {
                  label: log.action,
                  icon: "fa-circle",
                  color: "text-slate-500",
                  bg: "bg-slate-50",
                };
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 px-6 py-4 transition hover:bg-slate-50"
                  >
                    {/* Icon */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}
                    >
                      <i
                        className={`fas ${meta.icon} text-sm ${meta.color}`}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {meta.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {log.admin_name}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                        {log.details}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-medium text-slate-400">
                        {formatTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                  Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} dari {filteredLogs.length} aktivitas
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-chevron-left text-xs" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1;
                      if (
                        totalPages > 5 &&
                        page !== 1 &&
                        page !== totalPages &&
                        Math.abs(page - currentPage) > 1
                      ) {
                        if (page === 2 || page === totalPages - 1) return <span key={`dots-${page}`} className="px-1 text-xs text-slate-400">...</span>;
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                            currentPage === page
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-violet-600"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-chevron-right text-xs" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
