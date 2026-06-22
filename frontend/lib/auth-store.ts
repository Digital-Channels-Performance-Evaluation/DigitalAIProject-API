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
  _hasHydrated: boolean;
  lastActivity: number;  // Track last activity for inactivity timeout
  setHasHydrated: (v: boolean) => void;
  login: (email: string, password: string, mfa_code?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateAvatar: (avatar_url: string) => void;
  updateActivity: () => void;
}

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      lastActivity: Date.now(),

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      login: async (email, password, mfa_code?) => {
        const { data } = await api.post("/auth/login", { email, password, mfa_code });
        // Tokens are now in HTTPOnly cookies - just store user info
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
          lastActivity: Date.now(),
        });
      },

      logout: async () => {
        try { 
          await api.post("/auth/logout"); 
        } catch { /* ignore */ }
        // Clear cookies are handled by backend, clear local state
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          lastActivity: Date.now()
        });
      },

      checkAuth: async () => {
        const { isAuthenticated, user, lastActivity } = get();

        // Check for inactivity timeout
        if (isAuthenticated && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
          console.log("Session expired due to inactivity");
          await get().logout();
          return;
        }

        // Store already hydrated from localStorage — verify with API
        if (isAuthenticated && user) {
          try {
            // Verify session is still valid with backend
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
              lastActivity: Date.now(),
            });
          } catch {
            // Session invalid - logout
            set({ user: null, isAuthenticated: false });
          }
          return;
        }

        // No persisted session — check if cookies exist by trying to get user
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
            lastActivity: Date.now(),
          });
        } catch {
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
      // Only persist user + auth flag — never isLoading, _hasHydrated, or lastActivity
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
      onRehydrateStorage: () => (state) => {
        // Fires once on the client after localStorage is read
        state?.setHasHydrated(true);
      },
    }
  )
);

// Activity tracking - update on user interaction
if (typeof window !== "undefined") {
  const updateActivity = () => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      store.updateActivity();
    }
  };

  // Track mouse, keyboard, scroll, touch events
  ["mousedown", "keydown", "scroll", "touchstart", "click"].forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });

  // Check for inactivity every minute
  setInterval(() => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated && Date.now() - store.lastActivity > INACTIVITY_TIMEOUT) {
      console.log("Auto-logout due to inactivity");
      store.logout();
      window.location.href = "/login";
    }
  }, 60000); // Check every minute

  // Logout on browser/tab close (beforeunload)
  // Note: This is best-effort as some browsers may block it
  window.addEventListener("beforeunload", () => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      // Send synchronous logout request
      navigator.sendBeacon("/api/auth/logout");
    }
  });
}
