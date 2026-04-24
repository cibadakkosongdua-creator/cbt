import { supabase } from "./supabase";

/**
 * Log an admin activity to Supabase for audit trail.
 *
 * @param {"exam_activated"|"exam_deactivated"|"settings_saved"|"student_added"|"student_edited"|"student_deleted"|"students_imported"|"students_bulk_deleted"|"question_added"|"question_edited"|"question_deleted"|"questions_imported"|"questions_bulk_deleted"|"questions_bulk_duplicated"|"questions_bulk_moved"|"results_deleted"|"results_bulk_deleted"|"announcement_created"|"announcement_toggled"|"announcement_deleted"} action
 * @param {string} details — human-readable description
 * @param {{ name?: string, email?: string }} [user]
 */
export async function logActivity(action, details, user) {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      action,
      details,
      admin_name: user?.name || "Admin",
      admin_email: user?.email || "",
    });
    if (error) throw error;
  } catch (err) {
    // Logging should never break the app — fail silently
    console.error("[ActivityLog] Failed to log:", err);
  }
}

/**
 * Map action codes to human-readable labels + icons.
 */
export const ACTION_META = {
  exam_activated:        { label: "Ujian Diaktifkan",      icon: "fa-toggle-on",        color: "text-green-600",  bg: "bg-green-100" },
  exam_deactivated:      { label: "Ujian Dinonaktifkan",   icon: "fa-toggle-off",       color: "text-slate-500",  bg: "bg-slate-100" },
  settings_saved:        { label: "Pengaturan Disimpan",   icon: "fa-sliders-h",        color: "text-indigo-600", bg: "bg-indigo-100" },
  student_added:         { label: "Siswa Ditambah",        icon: "fa-user-plus",        color: "text-blue-600",   bg: "bg-blue-100" },
  student_edited:        { label: "Siswa Diedit",          icon: "fa-user-pen",         color: "text-blue-600",   bg: "bg-blue-100" },
  student_deleted:       { label: "Siswa Dihapus",         icon: "fa-user-minus",       color: "text-red-600",    bg: "bg-red-100" },
  students_imported:     { label: "Siswa Diimpor",         icon: "fa-file-import",      color: "text-green-600",  bg: "bg-green-100" },
  students_bulk_deleted: { label: "Semua Siswa Dihapus",   icon: "fa-users-slash",      color: "text-red-600",    bg: "bg-red-100" },
  question_added:        { label: "Soal Ditambah",         icon: "fa-plus-circle",      color: "text-violet-600", bg: "bg-violet-100" },
  question_edited:       { label: "Soal Diedit",           icon: "fa-pen-to-square",    color: "text-violet-600", bg: "bg-violet-100" },
  question_deleted:      { label: "Soal Dihapus",          icon: "fa-trash",            color: "text-red-600",    bg: "bg-red-100" },
  questions_imported:    { label: "Soal Diimpor",          icon: "fa-file-import",      color: "text-green-600",  bg: "bg-green-100" },
  questions_bulk_deleted:{ label: "Soal Bulk Delete",      icon: "fa-trash-can",        color: "text-red-600",    bg: "bg-red-100" },
  questions_bulk_duplicated:{ label: "Soal Diduplikat",    icon: "fa-copy",             color: "text-amber-600",  bg: "bg-amber-100" },
  questions_bulk_moved:  { label: "Soal Dipindah Subtes",  icon: "fa-arrow-right-arrow-left", color: "text-cyan-600", bg: "bg-cyan-100" },
  results_deleted:       { label: "Hasil Dihapus",         icon: "fa-chart-bar",        color: "text-red-600",    bg: "bg-red-100" },
  results_bulk_deleted:  { label: "Semua Hasil Dihapus",   icon: "fa-chart-bar",        color: "text-red-600",    bg: "bg-red-100" },
  announcement_created:  { label: "Pengumuman Dibuat",     icon: "fa-bullhorn",         color: "text-amber-600",  bg: "bg-amber-100" },
  announcement_toggled:  { label: "Pengumuman Diubah",     icon: "fa-bullhorn",         color: "text-amber-600",  bg: "bg-amber-100" },
  announcement_deleted:  { label: "Pengumuman Dihapus",    icon: "fa-bullhorn",         color: "text-red-600",    bg: "bg-red-100" },
};
