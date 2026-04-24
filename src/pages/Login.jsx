import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";
import { isAllowedAdmin } from "../lib/auth";
import { playSound } from "../lib/soundUtils";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { role, setRole, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", username)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("NISN tidak terdaftar!");
      if (data.password !== password) throw new Error("Password salah!");

      // Normalize snake_case from DB to camelCase for UI
      const studentData = {
        ...data,
        photoURL: data.photo_url,
        activeBorder: data.active_border || "none",
        xp: data.xp || 0,
        level: data.level || 1,
        unlockedItems: data.unlocked_items || ["avatar_1", "avatar_2", "avatar_3", "avatar_4", "border_none"]
      };

      setUser(studentData);
      playSound("success");
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Halo ${data.name}, selamat ujian!`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      playSound("error");
      Swal.fire("Gagal Login", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      // signInWithOAuth redirects the page, so we handle the result
      // in App.jsx's onAuthStateChange callback after redirect
    } catch (err) {
      playSound("error");
      Swal.fire("Gagal Login", err.message || "Gagal masuk dengan Google", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-50">

      {/* ── Left Panel: Branding (desktop only) ── */}
      <div className="relative hidden lg:flex lg:w-[48%] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-10 xl:p-14">
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SDN 02 Cibadak" className="h-11 w-11 object-contain drop-shadow-lg" />
            <div>
              <div className="text-base font-bold text-white">Smart CBT</div>
              <div className="text-xs text-white/60">SDN 02 Cibadak</div>
            </div>
          </div>

          {/* Hero text */}
          <div className="mt-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Platform Ujian Digital
            </div>
            <h1 className="text-4xl xl:text-5xl font-black leading-tight text-white">
              Ujian Online<br />
              <span className="text-white/60">Mudah & Aman</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/60 max-w-xs">
              Sistem CBT modern yang dirancang untuk siswa dan guru SDN 02 Cibadak.
            </p>
          </div>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {[
              { icon: "fa-shield-halved", title: "Aman & Terenkripsi", desc: "Data tersimpan aman di Supabase" },
              { icon: "fa-bolt", title: "Real-time & Cepat", desc: "Hasil langsung tersedia setelah ujian" },
              { icon: "fa-mobile-screen", title: "Mobile-First", desc: "Nyaman digunakan di HP maupun laptop" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <i className={`fas ${f.icon} text-sm text-white`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-xs text-white/50">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} SDN 02 Cibadak · Powered by Supabase
        </p>
      </div>

      {/* ── Right Panel: Form ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white px-5 py-10 sm:px-8 lg:px-12">
        {/* Mobile gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 lg:hidden" />

        <div className="w-full max-w-sm animate-fade-in-up">

          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <img src="/logo.png" alt="Smart CBT" className="mx-auto mb-4 h-16 w-16 object-contain drop-shadow-xl" />
            <div className="text-xl font-black text-slate-900">Smart CBT</div>
            <div className="text-sm text-slate-400 mt-0.5">SDN 02 Cibadak</div>
          </div>

          {/* Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-black text-slate-900">Selamat Datang 👋</h2>
            <p className="mt-1.5 text-sm text-slate-400">Pilih peran Anda untuk melanjutkan</p>
          </div>

          {/* Role switcher */}
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
            {[
              { id: "student", label: "Siswa", icon: "fa-user-graduate" },
              { id: "admin",   label: "Admin / Guru", icon: "fa-chalkboard-user" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  role === r.id
                    ? "bg-white shadow-md text-indigo-700 shadow-slate-200"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <i className={`fas ${r.icon} text-xs`} />
                {r.label}
              </button>
            ))}
          </div>

          {/* ── Student Form ── */}
          {role === "student" && (
            <form onSubmit={handleStudentLogin} className="space-y-4 animate-fade-in">
              {/* NISN */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  NISN
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="fas fa-id-card text-sm" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="input pl-10"
                    placeholder="0012345678"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="fas fa-lock text-sm" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="input pl-10 pr-12"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full btn-lg mt-2"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <i className="fas fa-arrow-right text-xs" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Admin: Google Sign-In ── */}
          {role === "admin" && (
            <div className="space-y-4 animate-fade-in">
              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                  <i className="fas fa-circle-info text-indigo-600 text-sm" />
                </div>
                <div className="text-xs leading-relaxed text-indigo-700">
                  Login admin menggunakan akun Google{" "}
                  <strong className="font-bold">@admin.sd.belajar.id</strong> atau{" "}
                  <strong className="font-bold">@guru.sd.belajar.id</strong>.
                  Pastikan Anda login dengan akun yang terdaftar.
                </div>
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white py-3.5 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-indigo-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
                    </svg>
                    Masuk dengan Google
                  </>
                )}
              </button>

              {/* Domain note */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-6">
                <span className="h-px flex-1 bg-slate-100" />
                <span className="flex items-center gap-1.5">
                  <i className="fas fa-lock text-[10px]" />
                  Khusus @admin.sd.belajar.id / @guru.sd.belajar.id
                </span>
                <span className="h-px flex-1 bg-slate-100" />
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-300">
            © {new Date().getFullYear()} Smart CBT · SDN 02 Cibadak
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
