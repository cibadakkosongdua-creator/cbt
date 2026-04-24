import { supabase } from "./supabase";

// Daftar domain email yang diizinkan login sebagai admin
export const ALLOWED_DOMAINS = [
  "admin.sd.belajar.id",
  "guru.sd.belajar.id",
];

// Cek apakah email termasuk domain atau masuk daftar admin di Supabase
export const isAllowedAdmin = async (email) => {
  console.log("[Auth] Checking admin for:", email);
  // 1. Cek Domain (belajar.id)
  const isDomainAllowed = ALLOWED_DOMAINS.some((d) => email.endsWith(`@${d}`));
  if (isDomainAllowed) {
    console.log("[Auth] Domain allowed");
    return true;
  }

  // 2. Cek tabel 'admins' di Supabase
  try {
    const { data, error } = await supabase
      .from("admins")
      .select("id")
      .eq("id", email)
      .maybeSingle();
    
    if (error) {
      console.error("[Auth] Supabase error:", error);
      throw error;
    }
    
    const exists = !!data;
    console.log("[Auth] Database check result:", exists);
    return exists;
  } catch (error) {
    console.error("[Auth] Exception checking admin status:", error);
    return false;
  }
};
