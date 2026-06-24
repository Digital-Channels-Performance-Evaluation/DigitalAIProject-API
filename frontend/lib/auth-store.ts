import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "./api";

interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_mfa_enabled: boolean;
  avatar_url: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;            // true once localStorage has been read on the client
  setHasHydrated: (v: boolean) => void;
  login: (email: string, password: string, mfa_code?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateAvatar: (avatar_url: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, password, mfa_code?) => {
        const { data } = await api.post("/auth/login", { email, password, ...(mfa_code ? { mfa_code } : {}) });
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        set({
          user: {
            id:             data.user_id,
            email:          data.email,
            full_name:      data.full_name,
            role:           data.role,
            is_mfa_enabled: false,
            avatar_url:     data.avatar_url ?? null,
          },
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: async () => {
        try { await api.post("/auth/logout"); } catch { /* ignore */ }
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      checkAuth: async () => {
        const { isAuthenticated, user } = get();

        // Store already hydrated from localStorage — just verify the token is still present
        if (isAuthenticated && user) {
          const token = localStorage.getItem("access_token");
          if (!token) {
            localStorage.removeItem("refresh_token");
            set({ user: null, isAuthenticated: false });
          }
          return;
        }

        // No persisted session — check for a bare token and validate it via API
        const token = localStorage.getItem("access_token");
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const { data } = await api.get("/auth/me");
          set({
            user: {
              id:             data.id,
              email:          data.email,
              full_name:      data.full_name,
              role:           data.role,
              is_mfa_enabled: data.is_mfa_enabled,
              avatar_url:     data.avatar_url ?? null,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateAvatar: (avatar_url: string) => {
        const { user } = get();
        if (user) set({ user: { ...user, avatar_url } });
      },
    }),
    {
      name: "ahadu-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist user + auth flag — never isLoading or _hasHydrated
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Fires once on the client after localStorage is read
        state?.setHasHydrated(true);
      },
    }
  )
);
