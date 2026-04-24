import React, { useState, useEffect, useRef } from "react";

/**
 * NotificationCenter — Bell icon + dropdown panel for admin/student notifications.
 *
 * Props:
 * - notifications: Array of { id, type, title, body, time, read? }
 * - onMarkRead: (id) => void
 * - onMarkAllRead: () => void
 */
const NotificationCenter = ({ notifications = [], onMarkRead, onMarkAllRead, onClearAll }) => {
  const [open, setOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const ref = useRef(null);

  // Deletion state
  const [clearedTs, setClearedTs] = useState(() => parseInt(localStorage.getItem("cbt_cleared_notifs_ts") || "0", 10));
  const [deletedIds, setDeletedIds] = useState(() => new Set(JSON.parse(localStorage.getItem("cbt_deleted_notif_ids") || "[]")));

  const handleClearAll = () => {
    const now = Date.now();
    setClearedTs(now);
    localStorage.setItem("cbt_cleared_notifs_ts", now.toString());
    setDeletedIds(new Set());
    localStorage.removeItem("cbt_deleted_notif_ids");
    onClearAll?.();
  };

  const handleClearItem = (e, id) => {
    e.stopPropagation();
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("cbt_deleted_notif_ids", JSON.stringify([...next]));
      return next;
    });
  };

  const visibleNotifications = notifications.filter((n) => {
    if (!n.time) return true;
    try {
      const nTime = n.time instanceof Date 
        ? n.time.getTime() 
        : typeof n.time?.toMillis === "function" 
          ? n.time.toMillis() 
          : new Date(n.time).getTime();
      
      if (isNaN(nTime)) return true;
      if (nTime < clearedTs) return false;
      if (deletedIds.has(n.id)) return false;
      return true;
    } catch (e) {
      return true;
    }
  });

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keep relative timestamps fresh while panel is open.
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [open]);

  const getIcon = (type) => {
    switch (type) {
      case "exam_submit":
        return "fa-check-circle text-green-500";
      case "exam_start":
        return "fa-play-circle text-blue-500";
      case "tab_switch":
        return "fa-triangle-exclamation text-amber-500";
      case "exam_open":
        return "fa-door-open text-indigo-500";
      case "result_available":
        return "fa-chart-bar text-violet-500";
      case "announcement":
        return "fa-bullhorn text-rose-500";
      default:
        return "fa-bell text-slate-400";
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts instanceof Date ? ts : typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    const diff = nowMs - date.getTime();
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mnt lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => {
          setNowMs(Date.now());
          setOpen((prev) => !prev);
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        title="Notifikasi"
      >
        <i className="fas fa-bell text-sm" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="fixed left-4 right-4 top-16 z-50 mt-2 max-h-[80vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-scale-in sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-96 sm:max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkAllRead?.();
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                >
                  Tandai dibaca
                </button>
              )}
              {visibleNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
                  title="Hapus Semua"
                >
                  <i className="fas fa-trash-alt" />
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[55vh] overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <i className="fas fa-bell-slash text-lg text-slate-400" />
                </div>
                <div className="text-sm font-semibold text-slate-500">
                  Belum ada notifikasi
                </div>
                <div className="text-xs text-slate-400">
                  Notifikasi akan muncul di sini
                </div>
              </div>
            ) : (
              visibleNotifications.slice(0, 50).map((n) => (
                <div key={n.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      onMarkRead?.(n.id);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 pr-10 ${
                      !n.read ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <i className={`fas ${getIcon(n.type)} text-sm`} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`text-sm font-semibold truncate ${
                            !n.read ? "text-slate-900" : "text-slate-600"
                          }`}
                        >
                          {n.title}
                        </div>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                        {n.body}
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-slate-400">
                        {formatTime(n.time)}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleClearItem(e, n.id)}
                    className="absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded bg-slate-200 text-slate-600 transition hover:bg-red-100 hover:text-red-600 group-hover:flex"
                    title="Hapus"
                  >
                    <i className="fas fa-times text-xs" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
