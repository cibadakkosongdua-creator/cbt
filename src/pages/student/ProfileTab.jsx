import React, { useState } from "react";
import { getAvatarGrad, getInitials } from "../../lib/avatarUtils";
import { computeStudentStats, ALL_ITEMS, BADGES } from "../../lib/achievements";
import AchievementGrid from "../../components/student/AchievementGrid";
import { AnimatedNumber } from "../../lib/useAnimatedCounter";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Swal from "sweetalert2";

/* ── Mini stat card (used inside hero) ─────────────────── */
const HeroStat = ({ label, value, suffix = "" }) => (
  <div className="flex-1 rounded-2xl bg-white/15 backdrop-blur-sm p-3 text-center ring-1 ring-white/10">
    <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
      {label}
    </div>
    <div className="mt-1 text-xl font-black text-white">
      {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      {suffix && <span className="text-sm opacity-70">{suffix}</span>}
    </div>
  </div>
);

const ProfileTab = ({ user, history = [], examConfig = {} }) => {
  const stats = computeStudentStats(history, examConfig);
  const { updateUser } = useAuthStore();
  const [updating, setUpdating] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryTab, setGalleryTab] = useState("avatars"); // "avatars" or "borders"

  const hasKilatKuning = history.some((r) => {
    const totalTime = Number(r.duration_limit || examConfig.duration || 60);
    const timeSpent = Number(r.duration || 0);
    const score = Number(r.score || 0);
    return score >= 90 && timeSpent > 0 && timeSpent <= totalTime / 2;
  });

  // Check if an item is unlocked
  const isUnlocked = (item) => {
    if (!item.requirementId) return true;
    const badge = BADGES.find(b => b.id === item.requirementId);
    return badge ? badge.check(history, examConfig) : true;
  };

  const handleUpdateAvatar = async (url) => {
    if (!user?.id) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ photo_url: url })
        .eq("id", user.id);

      if (error) throw error;

      updateUser({ photoURL: url });
      Swal.fire({
        icon: "success",
        title: "Avatar Diperbarui",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("[Profile] Update avatar error:", err);
      Swal.fire("Gagal", "Tidak bisa memperbarui avatar", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateBorder = async (borderId) => {
    if (!user?.id) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ active_border: borderId })
        .eq("id", user.id);

      if (error) throw error;

      updateUser({ activeBorder: borderId });
      Swal.fire({
        icon: "success",
        title: "Border Diperbarui",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("[Profile] Update border error:", err);
      Swal.fire("Gagal", "Tidak bisa memperbarui border", "error");
    } finally {
      setUpdating(false);
    }
  };

  const activeBorderClass = ALL_ITEMS.borders.find(b => b.id === (user?.activeBorder || "none"))?.class || "";

  const rarityColors = {
    legendary: "from-amber-400 to-orange-600",
    mythic: "from-purple-600 to-black",
  };

  const fields = [
    { icon: "fa-id-card", label: "NISN", value: user?.id },
    { icon: "fa-chalkboard", label: "Kelas", value: user?.kelas },
    { icon: "fa-map-marker-alt", label: "Tempat Lahir", value: user?.tempat_lahir },
    { icon: "fa-birthday-cake", label: "Tanggal Lahir", value: user?.tanggal_lahir },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Profil Saya</h2>
        <p className="mt-1 text-sm text-slate-400">
          Ringkasan aktivitas dan pencapaian kamu.
        </p>
      </div>

      {/* ══════ PROFILE HERO with embedded stats ══════ */}
      <div className="relative rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-xl shadow-indigo-100">
        {/* Decorative elements container (handles overflow) */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {/* Decorative pattern */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)`,
              backgroundSize: "20px 20px",
            }}
          />
          {/* Floating orbs */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
        </div>

        <div className="relative z-10 px-5 pt-7 pb-5 sm:px-7">
          {/* Top row: avatar + name */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl transition-transform group-hover:scale-105 ${activeBorderClass || "ring-4 ring-white/30"}`}
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-2xl font-black text-white ${getAvatarGrad(user?.name)}`}>
                    {getInitials(user?.name)}
                  </div>
                )}
                {updating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <i className="fas fa-spinner fa-spin text-white" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowGallery(!showGallery)}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg border-2 border-white hover:bg-indigo-700 transition-all active:scale-90"
              >
                <i className="fas fa-camera text-[10px]" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-xl font-black text-white truncate">
                  {user?.name || "–"}
                </div>
                {hasKilatKuning && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-amber-900 shadow-lg shadow-yellow-500/40 ring-2 ring-white animate-pulse" title="Kilat Kuning ⚡">
                    <i className="fas fa-bolt-lightning text-[10px]" />
                  </div>
                )}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md ring-1 ring-white/20">
                <i className="fas fa-graduation-cap text-[9px]" />
                Kelas {user?.kelas || "–"}
              </div>
            </div>
          </div>

          {/* Avatar & Border Gallery (Expandable) */}
          {showGallery && (
            <div className="mt-6 animate-fade-in-down rounded-3xl bg-white/10 p-5 backdrop-blur-xl ring-1 ring-white/20 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex p-1 gap-1 rounded-xl bg-black/20 backdrop-blur-md">
                  <button 
                    onClick={() => setGalleryTab("avatars")}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${galleryTab === "avatars" ? "bg-white text-indigo-700 shadow-lg" : "text-white/60 hover:text-white"}`}
                  >
                    Avatar
                  </button>
                  <button 
                    onClick={() => setGalleryTab("borders")}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${galleryTab === "borders" ? "bg-white text-indigo-700 shadow-lg" : "text-white/60 hover:text-white"}`}
                  >
                    Border
                  </button>
                </div>
                <button onClick={() => setShowGallery(false)} className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                  <i className="fas fa-times text-xs" />
                </button>
              </div>

              {galleryTab === "avatars" ? (
                <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 lg:grid-cols-8">
                  {ALL_ITEMS.avatars.map((item) => {
                    const unlocked = isUnlocked(item);
                    const badge = BADGES.find(b => b.id === item.requirementId);
                    return (
                      <div key={item.id} className="group relative">
                        <button
                          onClick={() => unlocked && handleUpdateAvatar(item.url)}
                          disabled={updating || !unlocked}
                          className={`relative aspect-square w-full overflow-hidden rounded-2xl border-2 transition-all ${
                            unlocked ? "hover:scale-110 active:scale-95 cursor-pointer" : "cursor-not-allowed grayscale opacity-60"
                          } ${
                            user?.photoURL === item.url ? "border-white bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "border-transparent bg-white/5 hover:border-white/30"
                          }`}
                        >
                          <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                          {!unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                              <i className="fas fa-lock text-white/80 text-sm" />
                            </div>
                          )}
                          {item.rarity && (
                            <div className={`absolute top-0 right-0 px-1.5 py-0.5 rounded-bl-lg text-[7px] font-black uppercase tracking-tighter text-white bg-gradient-to-br ${rarityColors[item.rarity]}`}>
                              {item.rarity}
                            </div>
                          )}
                        </button>
                        {/* Tooltip on hover */}
                        <div className="pointer-events-none absolute -bottom-2 left-1/2 z-[100] w-32 -translate-x-1/2 translate-y-full rounded-xl bg-slate-900/95 p-2 text-center text-[9px] font-bold text-white opacity-0 shadow-xl transition-all group-hover:translate-y-2 group-hover:opacity-100">
                          <div className="mb-1 text-indigo-300">{item.title}</div>
                          {unlocked ? (
                            <div className="text-emerald-400">Terbuka ✓</div>
                          ) : (
                            <div className="text-slate-400 leading-tight">Misi: {badge?.title || "???"}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                  {ALL_ITEMS.borders.map((item) => {
                    const unlocked = isUnlocked(item);
                    const isActive = (user?.activeBorder || "none") === item.id;
                    const badge = BADGES.find(b => b.id === item.requirementId);
                    return (
                      <div key={item.id} className="group relative">
                        <button
                          onClick={() => unlocked && handleUpdateBorder(item.id)}
                          disabled={updating || !unlocked}
                          className={`flex flex-col items-center gap-3 p-3 rounded-2xl transition-all ${
                            unlocked ? "hover:bg-white/10 active:scale-95 cursor-pointer" : "cursor-not-allowed opacity-60"
                          } ${isActive ? "bg-white/10 ring-1 ring-white/30" : ""}`}
                        >
                          <div className={`relative h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden transition-all ${item.class} ${!unlocked ? "grayscale" : ""}`}>
                            <img src={user?.photoURL || ALL_ITEMS.avatars[0].url} className="h-10 w-10 opacity-40" alt="preview" />
                            {!unlocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <i className="fas fa-lock text-white/80 text-sm" />
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-black text-white leading-tight truncate w-24">{item.title}</div>
                            {item.rarity && (
                              <div className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter text-white bg-gradient-to-br ${rarityColors[item.rarity]}`}>
                                {item.rarity}
                              </div>
                            )}
                          </div>
                        </button>
                        {/* Tooltip on hover */}
                        <div className="pointer-events-none absolute -bottom-2 left-1/2 z-[100] w-36 -translate-x-1/2 translate-y-full rounded-xl bg-slate-900/95 p-2 text-center text-[9px] font-bold text-white opacity-0 shadow-xl transition-all group-hover:translate-y-2 group-hover:opacity-100">
                          {unlocked ? (
                            <div className="text-emerald-400">Tersedia untuk digunakan</div>
                          ) : (
                            <div className="text-slate-400 leading-tight">Butuh Achievement: <br/><span className="text-indigo-300">"{badge?.title}"</span></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Bottom legend */}
              <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap gap-4 items-center justify-center">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/50">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-600" /> Legendary
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/50">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-br from-purple-600 to-black" /> Mythic
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/50">
                  <i className="fas fa-lock text-[8px]" /> Selesaikan Misi untuk Unlock
                </div>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="mt-6 flex gap-2.5">
            <HeroStat
              label="Ujian"
              value={stats.totalExams}
            />
            <HeroStat
              label="Rata-rata"
              value={stats.avgScore ?? "–"}
            />
            <HeroStat
              label="Terbaik"
              value={stats.bestScore ?? "–"}
            />
            <HeroStat
              label="Lulus"
              value={stats.passRate}
              suffix="%"
            />
          </div>
        </div>
      </div>

      {/* ══════ ACHIEVEMENTS ══════ */}
      <AchievementGrid history={history} examConfig={examConfig} />

      {/* ══════ ACCOUNT INFO ══════ */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Informasi Akun
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {fields.map((item) => (
            <div key={item.label} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <i className={`fas ${item.icon} text-indigo-500 text-xs`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {item.label}
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                  {item.value || "–"}
                </div>
              </div>
            </div>
          ))}
          {/* Active status row */}
          <div className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <i className="fas fa-circle-check text-emerald-500 text-xs" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </div>
              <div className="text-sm font-semibold text-emerald-600 mt-0.5">
                Aktif
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
