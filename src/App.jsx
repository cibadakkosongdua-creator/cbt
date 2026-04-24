import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import StudentDash from "./pages/StudentDash";
import AdminDash from "./pages/admin/AdminDash";
import ExamRoom from "./pages/ExamRoom";
import ResultsView from "./pages/ResultsView";
import BootLoader from "./components/BootLoader";
import OfflineBanner from "./ui/OfflineBanner";
import ErrorBoundary from "./components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

import { isAllowedAdmin } from "./lib/auth";
import Swal from "sweetalert2";

// Minimum boot time in ms to avoid content flash on fast connections
const MIN_BOOT_MS = 600;

// Result wrapper — only accessible to any authenticated user (student or admin)
const ResultWrapper = () => {
  const { id } = useParams();
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <OfflineBanner />
      <ResultsView resultId={id} />
    </>
  );
};

// Protected route component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, role } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
};

function AnimatedRoutes() {
  const { user, role, setUser, setRole } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [minLoadingDone, setMinLoadingDone] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingDone(true);
    }, MIN_BOOT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Auth listener untuk menangani sesi Supabase (terutama Google Login)
  useEffect(() => {
    // Jalankan pengecekan sesi saat pertama kali boot dengan timeout safety
    const initAuth = async () => {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 5000));
      
      try {
        console.log("[App] Starting auth initialization...");
        const result = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);

        if (result.timeout) {
          console.warn("[App] Auth initialization timed out after 5s");
        } else {
          const { data: { session } } = result;
          if (!session && role === "admin") {
            console.warn("[App] No active session found for admin, resetting store.");
            setUser(null);
            setRole("student");
          }
        }
      } catch (e) {
        console.error("[App] Init auth error:", e);
      } finally {
        console.log("[App] Auth initialization complete.");
        setAuthChecked(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[App] Auth event:", event, session?.user?.email);
      
      try {
        if (session?.user) {
          const email = session.user.email;
          
          // Non-blocking admin check
          isAllowedAdmin(email).then(async (isAdmin) => {
            if (isAdmin) {
              const { data: adminData } = await supabase
                .from("admins")
                .select("*")
                .eq("id", email)
                .maybeSingle();

              setUser({
                id: "admin",
                uid: email,
                email: email,
                name: adminData?.name || session.user.user_metadata?.full_name || email.split("@")[0],
                photoURL: adminData?.photo_url || session.user.user_metadata?.avatar_url,
              });
              setRole("admin");
            } else if (event === "SIGNED_IN") {
              console.warn("[App] Non-admin tried to login via Google:", email);
              
              // Tampilkan notifikasi penolakan
              Swal.fire({
                icon: "error",
                title: "Akses Ditolak",
                text: "Hanya akun dengan domain @belajar.id atau yang sudah terdaftar di database yang bisa mengakses panel Admin.",
                confirmButtonColor: "#4f46e5",
              });

              await supabase.auth.signOut();
              setUser(null);
              setRole("student");
            }
          }).catch(err => {
            console.error("[App] Admin check failed:", err);
          });
          
        } else if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)) {
          // Ambil role terbaru dari store untuk menghindari loop dependency
          const currentRole = useAuthStore.getState().role;
          if (currentRole === "admin") {
            console.log("[App] No session found for admin, resetting to student.");
            setUser(null);
            setRole("student");
          }
        }
      } catch (err) {
        console.error("[App] Auth change error:", err);
      } finally {
        // Always set to true so UI can render
        setAuthChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setRole]); // Hapus 'role' dari dependency untuk menghindari loop reset state

  if (!authChecked || !minLoadingDone) {
    return <BootLoader />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname.split("/")[1] || "root"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="min-h-screen bg-slate-50"
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/" element={
            !user ? <Navigate to="/login" replace /> :
            role === "admin" ? <Navigate to="/admin" replace /> :
            <Navigate to="/dashboard" replace />
          } />
          <Route path="/dashboard/*" element={
            <ProtectedRoute allowedRole="student"><StudentDash /></ProtectedRoute>
          } />
          <Route path="/exam" element={
            <ProtectedRoute allowedRole="student"><ExamRoom /></ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRole="admin"><AdminDash /></ProtectedRoute>
          } />
          <Route path="/result/:id" element={<ResultWrapper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
