import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "../lib/supabase";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      role: "student",
      setUser: (userData) => set({ user: userData }),
      setRole: (newRole) => set({ role: newRole }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      logout: async () => {
        // Remove presence from Supabase if admin
        const currentUser = get().user;
        if (currentUser) {
          const presenceId = currentUser.uid || currentUser.email?.replace(/@|\./g, "_");
          if (presenceId) {
            await supabase.from("admin_presence").delete().eq("id", presenceId);
          }
        }

        // Sign out from Supabase Auth (covers Google admin login)
        await supabase.auth.signOut();
        set({ user: null, role: "student" });
      },
    }),
    {
      name: "cbt-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
